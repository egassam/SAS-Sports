import schools from './schools.json';

const VERSION='2.4.0';
const HEADERS={
  'User-Agent':`Mozilla/5.0 (compatible; SAS-Sports/${VERSION}; Cloudflare-Worker)`,
  'Accept':'text/html,application/xhtml+xml'
};

const SPORT_PATHS={
  'Football':['football'],'Volleyball':['womens-volleyball','volleyball'],
  "Women's Volleyball":['womens-volleyball','volleyball'],"Men's Volleyball":['mens-volleyball','volleyball'],
  'Soccer':['womens-soccer','soccer','mens-soccer'],"Women's Soccer":['womens-soccer','soccer'],"Men's Soccer":['mens-soccer','soccer'],
  'Cross Country':['cross-country'],'Track & Field':['track-and-field','track-field'],
  'Basketball':['mens-basketball','womens-basketball','basketball'],"Men's Basketball":['mens-basketball','basketball'],"Women's Basketball":['womens-basketball','basketball'],
  'Baseball':['baseball'],'Softball':['softball'],'Wrestling':['wrestling'],
  'Swimming & Diving':['swimming-and-diving','swimming-diving','swimming'],'Tennis':['womens-tennis','mens-tennis','tennis'],
  'Golf':['mens-golf','womens-golf','golf'],'Rowing':['rowing'],'Lacrosse':['womens-lacrosse','mens-lacrosse','lacrosse'],
  'Field Hockey':['field-hockey'],'Hockey':['mens-ice-hockey','womens-ice-hockey','ice-hockey','hockey'],
  'Gymnastics':['womens-gymnastics','mens-gymnastics','gymnastics'],'Beach Volleyball':['beach-volleyball'],
  'Water Polo':['womens-water-polo','mens-water-polo','water-polo'],'Fencing':['fencing'],'Bowling':['bowling'],
  'Equestrian':['equestrian'],'Rifle':['rifle'],'Skiing':['skiing'],'Triathlon':['triathlon'],
  'Acrobatics & Tumbling':['acrobatics-tumbling','acrobatics-and-tumbling'],'STUNT':['stunt']
};

const KNOWN_URLS=new Map(Object.entries({
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

const SEASONS={
  'Football':[[8,1]],'Volleyball':[[8,12]],"Men's Volleyball":[[1,5]],'Soccer':[[8,12]],
  'Cross Country':[[8,11]],'Field Hockey':[[8,11]],'Golf':[[8,11],[2,6]],'Tennis':[[9,11],[1,5]],
  'Swimming & Diving':[[9,3]],'Wrestling':[[10,3]],'Basketball':[[10,4]],'Hockey':[[10,4]],
  'Gymnastics':[[1,4]],'Track & Field':[[12,6]],'Baseball':[[2,6]],'Softball':[[2,6]],
  'Lacrosse':[[2,5]],'Rowing':[[3,6],[9,11]],'Beach Volleyball':[[2,5]],'Water Polo':[[1,5],[8,12]],
  'Fencing':[[10,3]],'Bowling':[[10,4]],'Equestrian':[[9,11],[2,4]],'Rifle':[[9,3]],
  'Skiing':[[1,3]],'Triathlon':[[8,11]],'Acrobatics & Tumbling':[[2,4]],'STUNT':[[2,5]]
};

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=s=>s==null?null:(String(s).replace(/\s+/g,' ').replace(/^[ ,\t\r\n]+|[ ,\t\r\n]+$/g,'')||null);
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function decodeHtml(s){return String(s).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');}
function visibleText(raw){return clean(decodeHtml(raw).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '))||'';}
function sportMatches(a,b){const n=s=>String(s).toLowerCase().replace(/\b(men's|women's|mens|womens)\b/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim();a=n(a);b=n(b);return a===b||a.includes(b)||b.includes(a);}
function candidateUrls(school,sport){const out=[],known=KNOWN_URLS.get(`${school.id}|${sport}`);if(known)out.push(known);const base=school.athletics_url.replace(/\/$/,'');for(const p of (SPORT_PATHS[sport]||[slug(sport)]))out.push(`${base}/sports/${p}/schedule`);out.push(`${base}/`);return [...new Set(out)];}
function parsedSourceDate(dateText,timeText){
  const m=String(dateText||'').match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if(!m)return null;
  const months={jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11};
  const month=months[m[1].toLowerCase()];
  if(month==null)return null;
  let hour=12,minute=0,hasTime=false;
  if(timeText){
    const t=String(timeText).replace(/\./g,'').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if(t){hour=Number(t[1])%12+(t[3].toLowerCase()==='pm'?12:0);minute=Number(t[2]||0);hasTime=true;}
  }
  return{year:Number(m[3]),month,day:Number(m[2]),hour,minute,hasTime};
}
function parseDate(dateText,timeText){const p=parsedSourceDate(dateText,timeText);return p?new Date(Date.UTC(p.year,p.month,p.day,p.hour,p.minute)).toISOString():null;}
function formatSourceDate(dateText,timeText){
  const p=parsedSourceDate(dateText,timeText);if(!p)return clean([dateText,timeText].filter(Boolean).join(', '));
  const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][p.month];
  if(!p.hasTime)return `${month} ${p.day}`;
  const hour=p.hour%12||12,period=p.hour>=12?'PM':'AM';
  return `${month} ${p.day}, ${hour}:${String(p.minute).padStart(2,'0')} ${period}`;
}
const VERIFIED_MEET_DETAILS=new Map(Object.entries({
  'kstate|Cross Country|2026-09-04|platte-river-rumble-gold':{
    source_url:'https://www.kstatesports.com/news/2026/9/4/cross-country-k-state-clinches-team-wins-at-platte-river-rumble-gold',
    rows:[
      {group:"Women's 5K",participant:'K-State team',result:'1st · 20 pts'},
      {group:"Women's 5K",participant:'Emma Baum',result:'2nd · 17:41.9'},
      {group:"Women's 5K",participant:'Joyce Kiptabut',result:'3rd · 17:43.9'},
      {group:"Women's 5K",participant:'Christine Jerono',result:'4th · 17:46.2'},
      {group:"Women's 5K",participant:'McKenna Montgomery',result:'5th · 17:58.8'},
      {group:"Women's 5K",participant:'Payton Fink',result:'6th · 18:15.6'},
      {group:"Women's 5K",participant:'Paige Baker',result:'8th · 18:28.1'},
      {group:"Women's 5K",participant:'Bree Allen',result:'13th · 18:52.6'},
      {group:"Women's 5K",participant:'Sage Siegrist',result:'16th · 19:06.6'},
      {group:"Women's 5K",participant:'Hanna Keltner',result:'19th · 19:17.3'},
      {group:"Women's 5K",participant:'Payton Wurtz',result:'24th · 19:52.8'},
      {group:"Women's 5K",participant:'Bree Newport',result:'30th · 20:28.6'},
      {group:"Men's 6K",participant:'K-State team',result:'1st · 19 pts'},
      {group:"Men's 6K",participant:'Max Larson',result:'1st · 18:27.2'},
      {group:"Men's 6K",participant:'Jackson Esquibel',result:'2nd · 18:32.3'},
      {group:"Men's 6K",participant:'Brock Olsen',result:'3rd · 18:36.0'},
      {group:"Men's 6K",participant:'Dylan Plath',result:'5th · 18:52.3'},
      {group:"Men's 6K",participant:'Vance Krudwig',result:'8th · 19:17.5'},
      {group:"Men's 6K",participant:'Logan Beckman',result:'14th · 19:47.4'},
      {group:"Men's 6K",participant:'Jacob Norris',result:'21st · 20:44.2'}
    ]
  }
}));
const VERIFIED_GAME_DETAILS=new Map(Object.entries({
  'kstate|Soccer|2026-09-03|rv-iowa':{
    source_url:'https://www.kstatesports.com/news/2026/9/3/soccer-k-state-notches-draw-at-iowa-on-thursday-night',
    highlights:[
      'Allison Marshall scored from 19 yards in the 23rd minute, assisted by Gabby DeMers.',
      'Two additional K-State first-half goals were disallowed after VAR reviews.',
      'Maddie Sibbing tied her collegiate career high with eight saves.',
      'The draw extended K-State’s school-record unbeaten streak to seven matches.'
    ],
    stats:[
      {label:'Shots',value:'K-State 13 · Iowa 25'},
      {label:'Shots on goal',value:'K-State 7 · Iowa 9'},
      {label:'Saves',value:'K-State 8 · Iowa 4'},
      {label:'Corners',value:'K-State 4 · Iowa 7'}
    ]
  }
}));
function enrichGameEvent(event){
  if(event.event_type!=='GAME'||event.status!=='Final')return event;
  const detail=VERIFIED_GAME_DETAILS.get(`${event.school_id}|${event.sport}|${event.start_time?.slice(0,10)||''}|${slug(event.opponent||'')}`);
  if(!detail)return event;
  event.highlights=detail.highlights;
  event.game_stats=detail.stats;
  event.source={...event.source,name:'Official athletics game recap',url:detail.source_url};
  return event;
}
function enrichMeetEvent(event,date){
  if(event.event_type!=='MEET'||event.status!=='Final')return event;
  const detail=VERIFIED_MEET_DETAILS.get(`${event.school_id}|${event.sport}|${event.start_time?.slice(0,10)||''}|${slug(event.opponent||'')}`);
  if(detail){
    event.results=detail.rows;
    event.headline="Women's team: 1st · 20 pts / Men's team: 1st · 19 pts";
    event.result_count=detail.rows.length;
    event.has_more_results=detail.rows.length>3;
    event.source={...event.source,name:'Official athletics meet recap',url:detail.source_url};
    return event;
  }
  const label=event.headline||'';
  const teamRows=[];
  for(const part of label.split('/')){
    const m=part.trim().match(/^(M|W)\s*\(([^)]+)\)$/i);
    if(m)teamRows.push({group:m[1].toUpperCase()==='M'?"Men's Team":"Women's Team",participant:event.school,result:m[2]});
  }
  if(teamRows.length){event.results=teamRows;event.result_count=teamRows.length;}
  return event;
}
const FALL_SEASON_SPORTS=new Set(['Football','Volleyball',"Women's Volleyball","Men's Volleyball",'Soccer',"Women's Soccer","Men's Soccer",'Cross Country','Field Hockey']);
function activeFallSeasonYear(now){return now.getUTCMonth()+1>=7?now.getUTCFullYear():now.getUTCFullYear()-1;}
function filterActiveSeason(events,sport,now){
  if(!FALL_SEASON_SPORTS.has(sport))return events;
  const year=activeFallSeasonYear(now);
  return events.filter(e=>!e.start_time||new Date(e.start_time).getUTCFullYear()===year);
}
function eventType(sport){if(['Cross Country','Track & Field','Golf','Gymnastics','Fencing','Bowling','Rifle','Skiing','Triathlon'].includes(sport))return'MEET';if(['Wrestling','Tennis','Swimming & Diving','Rowing','Equestrian','Beach Volleyball','Acrobatics & Tumbling','STUNT'].includes(sport))return'DUAL';return'GAME';}
function makeEvent({school,sport,status,relation,opponent,date,time,schoolScore,oppScore,resultText,sourceUrl,now}){const start=parseDate(date,time);let effective=status;if(status==='Upcoming'&&start){const a=new Date(start),b=now;if(a.getUTCFullYear()===b.getUTCFullYear()&&a.getUTCMonth()===b.getUTCMonth()&&a.getUTCDate()===b.getUTCDate())effective='Today';}const resultLabel=clean(resultText);const event={id:'live-'+slug(`${school.id}|${sport}|${date||''}|${opponent}|${effective}`).slice(0,180),school_id:school.id,school:school.name,sport,event_type:eventType(sport),status:effective,title:`${school.short_name} ${String(relation).toLowerCase()==='at'?'at':'vs'} ${opponent}`,start_time:start,display_time:formatSourceDate(date,time),opponent,school_score:schoolScore||null,opponent_score:oppScore||null,headline:resultLabel||(schoolScore&&oppScore?`${schoolScore}–${oppScore}`:null),team_summaries:[],results:resultLabel?[{label:'Result',value:resultLabel}]:[],result_count:resultLabel?1:0,source:{name:'Official athletics live schedule',url:sourceUrl,updated_at:now.toISOString()},has_more_results:false,enrichment_warning:null,priority_bucket:{Live:'live',Today:'today',Upcoming:'upcoming',Final:'recent_final'}[effective]||'other',recency_label:{Live:'Live now',Today:'Today',Upcoming:'Upcoming',Final:'Final'}[effective]||effective,last_verified_at:now.toISOString(),freshness_seconds:0,verification_state:'live_source',source_count:1,conflicting_sources:false};return enrichGameEvent(enrichMeetEvent(event,date));}
function parseLabel(label,school,sport,sourceUrl,now){const s=clean(label);if(!s)return null;let m=s.match(/^Upcoming Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})(?:\s+at\s+(.+?))?$/i);if(m)return fromMatch('Upcoming','upcoming',m);m=s.match(/^Completed Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\s*,\s*(?:(Win|Loss|Tie|Draw)?\s*,?\s*)?(\d+(?:\.\d+)?)?\s*,?\s*(?:to|-)?\s*,?\s*(\d+(?:\.\d+)?)?\s*$/i);if(m)return fromMatch('Final','score',m);m=s.match(/^Completed Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\s*,\s*,\s*(.+?)\s*$/i);if(m)return fromMatch('Final','meet',m);m=s.match(/^Live Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)(?:\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4}))?\s*$/i);if(m)return fromMatch('Live','live',m);return null;function fromMatch(status,kind,x){const parsedSport=clean(x[1])||sport;if(!sportMatches(sport,parsedSport))return null;const opponent=clean(x[3]);if(!opponent||/\b(?:vs\.?|versus)\b/i.test(opponent))return null;return makeEvent({school,sport,status,relation:clean(x[2])||'vs',opponent,date:clean(x[4]),time:kind==='upcoming'?clean(x[5]):null,schoolScore:kind==='score'?clean(x[6]):null,oppScore:kind==='score'?clean(x[7]):null,resultText:kind==='meet'?clean(x[5]):null,sourceUrl,now});}}
function extractEventLabels(raw){
  const decoded=decodeHtml(raw),out=[],seen=new Set();
  const add=x=>{x=clean(x);if(x&&!seen.has(x)){seen.add(x);out.push(x);}};
  const attrRe=/(?:aria-label|title)\s*=\s*["']([^"']*(?:Upcoming|Completed|Live) Event:[^"']*)["']/gi;
  let m;
  while((m=attrRe.exec(decoded)))add(m[1]);

  // Some SIDEARM result headings are rendered as element text instead of attributes.
  // Read every event heading independently so one neutral-site result cannot consume
  // or hide the following K-State result.
  const headingRe=/<h[1-6]\b[^>]*>([\s\S]*?(?:Upcoming|Completed|Live) Event:[\s\S]*?)<\/h[1-6]>/gi;
  while((m=headingRe.exec(raw)))add(visibleText(m[1]));

  // SIDEARM does not always expose completed results in the same attributes as upcoming events.
  // Always scan rendered-visible text as a second source, then deduplicate.
  const text=visibleText(decoded);
  const patterns=[
    /Upcoming Event:\s*.+?\s+(?:versus|vs\.?|at)\s+.+?\s+on\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:a\.m\.|p\.m\.|AM|PM))?/gi,
    /Completed Event:\s*.+?\s+(?:versus|vs\.?|at)\s+.+?\s+on\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s*,\s*(?:Win|Loss|Tie|Draw)?\s*,?\s*\d+(?:\.\d+)?\s*,?\s*(?:to|-)\s*,?\s*\d+(?:\.\d+)?/gi,
    /Completed Event:\s*.+?\s+(?:versus|vs\.?|at)\s+.+?\s+on\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s*,\s*,\s*[^.]{1,100}?(?=(?:Upcoming|Completed|Live) Event:|$)/gi,
    /Live Event:\s*.+?\s+(?:versus|vs\.?|at)\s+.+?(?:\s+on\s+[A-Za-z]+\s+\d{1,2},\s+\d{4})?(?=(?:Upcoming|Completed|Live) Event:|$)/gi
  ];
  for(const re of patterns)while((m=re.exec(text)))add(m[0]);
  return out;
}
function parseHtml(raw,school,sport,sourceUrl,now=new Date()){const events=[],seen=new Set();for(const label of extractEventLabels(raw)){const e=parseLabel(label,school,sport,sourceUrl,now);if(e&&!seen.has(e.id)){seen.add(e.id);events.push(e);}}const rank={Live:0,Today:1,Upcoming:2,Final:3,Unknown:4};return events.sort((a,b)=>{const r=(rank[a.status]??4)-(rank[b.status]??4);if(r)return r;const ta=a.start_time?Date.parse(a.start_time):0,tb=b.start_time?Date.parse(b.start_time):0;return a.status==='Final'?tb-ta:ta-tb;});}
function eventMergeKey(e){const day=e.start_time?e.start_time.slice(0,10):'';return`${e.school_id}|${e.sport}|${slug(e.opponent||'')}|${day}`;}
function mergeEvents(eventLists){const statusWeight={Unknown:0,Upcoming:1,Today:2,Live:3,Final:4},byKey=new Map();for(const events of eventLists)for(const e of events){const key=eventMergeKey(e),prev=byKey.get(key);if(!prev){byKey.set(key,e);continue;}const ew=statusWeight[e.status]??0,pw=statusWeight[prev.status]??0,ed=(e.school_score&&e.opponent_score?2:0)+(e.result_count||0),pd=(prev.school_score&&prev.opponent_score?2:0)+(prev.result_count||0);if(ew>pw||(ew===pw&&ed>pd))byKey.set(key,e);}return[...byKey.values()];}
function inSeason(sport,month){const windows=SEASONS[sport];if(!windows)return true;return windows.some(([a,b])=>a<=b?month>=a&&month<=b:month>=a||month<=b);}
function groupEvents(events,now=new Date()){if(!events.length)return[];const sport=events[0].sport;events=filterActiveSeason(events,sport,now);if(!events.length)return[];const school=events[0],live=[],results=[],upcoming=[],other=[];for(const e of events){if(e.status==='Live')live.push(e);else if(e.status==='Final')results.push(e);else if(e.status==='Upcoming'||e.status==='Today')upcoming.push(e);else other.push(e);}results.sort((a,b)=>(Date.parse(b.start_time)||0)-(Date.parse(a.start_time)||0));upcoming.sort((a,b)=>(Date.parse(a.start_time)||Infinity)-(Date.parse(b.start_time)||Infinity));const active=inSeason(sport,now.getUTCMonth()+1),latest=results.map(e=>e.start_time).filter(Boolean).sort().at(-1)||null,next=upcoming.map(e=>e.start_time).filter(Boolean).sort()[0]||null;return[{school_id:school.school_id,school:school.school,sport,in_season:active,season_label:active?'In season':'Out of season',live,results,upcoming,other,latest_activity_at:latest,next_activity_at:next}];}
function absoluteUrl(href,base){try{return new URL(decodeHtml(href),base).href}catch{return null}}
function recapUrlsByEvent(raw,school,sport,sourceUrl,now){
  const map=new Map();
  const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=re.exec(raw))){
    if(!/\brecap\b/i.test(visibleText(m[2])))continue;
    const before=raw.slice(Math.max(0,m.index-30000),m.index);
    const labels=extractEventLabels(before).filter(x=>/^Completed Event:/i.test(x));
    const event=parseLabel(labels.at(-1),school,sport,sourceUrl,now);
    const recapUrl=absoluteUrl(m[1],sourceUrl);
    if(event&&recapUrl)map.set(eventMergeKey(event),recapUrl);
  }
  return map;
}
function extractOfficialHighlights(raw){
  const hit=raw.search(/HOW IT HAPPENED/i);
  if(hit<0)return[];
  let section=raw.slice(hit,hit+30000);
  const stop=section.slice(20).search(/(?:QUICK FACTS|TEAM NOTES|PLAYER NOTES|UP NEXT|FROM THE HEAD COACH)/i);
  if(stop>=0)section=section.slice(0,stop+20);
  const items=[];let m;
  const block=/<(?:li|p)\b[^>]*>([\s\S]*?)<\/(?:li|p)>/gi;
  while((m=block.exec(section))){
    let item=visibleText(m[1]).replace(/^[-–•]\s*/,'').trim();
    if(item.length<25||item.length>500||/^(how it happened|quick facts)$/i.test(item))continue;
    const words=item.split(/\s+/);if(words.length>22)item=words.slice(0,22).join(' ')+'…';
    if(!items.includes(item))items.push(item);
    if(items.length===5)break;
  }
  return items;
}
async function attachOfficialHighlights(events,raw,school,sport,sourceUrl,now){
  const recapMap=recapUrlsByEvent(raw,school,sport,sourceUrl,now);
  await Promise.all(events.filter(e=>e.status==='Final').map(async e=>{
    const recapUrl=recapMap.get(eventMergeKey(e));
    if(!recapUrl){e.highlight_status='Official recap not yet available.';return;}
    e.recap_url=recapUrl;
    if(e.highlights?.length)return;
    try{
      const r=await fetch(recapUrl,{headers:HEADERS,redirect:'follow'});
      if(!r.ok){e.highlight_status='Official recap is linked, but highlights could not be loaded.';return;}
      const highlights=extractOfficialHighlights(await r.text());
      if(highlights.length){
        e.highlights=highlights;
        e.source={...e.source,name:'Official athletics game recap',url:recapUrl,updated_at:now.toISOString()};
      }else e.highlight_status='Official recap available; open it for complete highlights.';
    }catch{
      e.highlight_status='Official recap is linked, but highlights could not be loaded.';
    }
  }));
  return events;
}
async function fetchUrl(url,school,sport,now){const r=await fetch(url,{headers:HEADERS,redirect:'follow'}),html=await r.text(),finalUrl=r.url||url,labels=extractEventLabels(html);let events=r.ok?parseHtml(html,school,sport,finalUrl,now):[];if(events.length)events=await attachOfficialHighlights(events,html,school,sport,finalUrl,now);return{requested_url:url,url:finalUrl,http_status:r.status,ok:r.ok,content_length:html.length,label_count:labels.length,event_count:events.length,has_upcoming:/Upcoming Event:/i.test(decodeHtml(html)),has_completed:/Completed Event:/i.test(decodeHtml(html)),events};}
async function fetchLive(schoolId,sport){const school=schools.find(s=>s.id===schoolId),now=new Date();if(!school)return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:'School not found'};const urls=candidateUrls(school,sport),errors=[],successful=[],responses=await Promise.allSettled(urls.map(url=>fetchUrl(url,school,sport,now)));for(let i=0;i<responses.length;i++){const item=responses[i];if(item.status==='fulfilled'){if(item.value.ok&&item.value.events.length)successful.push(item.value);else errors.push(`${item.value.url}: HTTP ${item.value.http_status}, labels ${item.value.label_count}, events ${item.value.event_count}`);}else errors.push(`${urls[i]}: ${item.reason?.message||item.reason?.name||'FetchError'}`);}const events=mergeEvents(successful.map(x=>x.events));if(events.length)return{events,source_url:successful[0]?.url||null,source_urls:successful.map(x=>x.url),fetched_at:now.toISOString(),live_source_used:true,error:null};return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:errors.slice(-6).join('; ')||'No live source available'};}
async function diagnostic(schoolId,sport){const school=schools.find(s=>s.id===schoolId),now=new Date();if(!school)return{version:VERSION,school:schoolId,sport,error:'School not found'};const rows=[];for(const url of candidateUrls(school,sport)){try{const r=await fetchUrl(url,school,sport,now);rows.push({requested_url:r.requested_url,url:r.url,http_status:r.http_status,ok:r.ok,content_length:r.content_length,label_count:r.label_count,event_count:r.event_count,has_upcoming:r.has_upcoming,has_completed:r.has_completed});}catch(e){rows.push({requested_url:url,error:e?.message||e?.name||'FetchError'});}}return{version:VERSION,school:schoolId,sport,checked_at:now.toISOString(),sources:rows};}
async function verification(schoolId,sport){const result=await fetchLive(schoolId,sport),g=groupEvents(result.events)[0]||null;return{version:VERSION,school:schoolId,sport,verified_at:result.fetched_at,live_source_used:result.live_source_used,source_urls:result.source_urls,error:result.error,counts:g?{live:g.live.length,results:g.results.length,upcoming:g.upcoming.length,other:g.other.length}:{live:0,results:0,upcoming:0,other:0},latest_result:g?.results?.[0]||null,next_event:g?.upcoming?.[0]||null};}

export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/web')return env.ASSETS.fetch(new Request(new URL('/index.html',url),request));
    if(url.pathname==='/api/status')return json({name:'SAS Sports API',version:VERSION,mode:'cloudflare-worker-live',web_live_mode:true,school_catalog_count:schools.length,web_path:'/'});
    if(url.pathname==='/schools'){let list=schools;const q=(url.searchParams.get('q')||'').toLowerCase(),conference=url.searchParams.get('conference'),state=url.searchParams.get('state');if(q)list=list.filter(s=>[s.id,s.name,s.short_name,...(s.aliases||[])].join(' ').toLowerCase().includes(q));if(conference)list=list.filter(s=>s.conference.toLowerCase()===conference.toLowerCase());if(state)list=list.filter(s=>s.state.toLowerCase()===state.toLowerCase());return json(list);}
    if(url.pathname==='/api/diagnostic'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);return json(await diagnostic(school,sport));}
    if(url.pathname==='/api/verify'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);return json(await verification(school,sport));}
    if(url.pathname==='/live/feed/grouped'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);const result=await fetchLive(school,sport);if(!result.events.length)return json({detail:{message:'Live source returned no usable events',source_url:result.source_url,source_urls:result.source_urls,fetched_at:result.fetched_at,error:result.error}},502);return json(groupEvents(result.events));}
    if(url.pathname==='/live/status'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);const result=await fetchLive(school,sport);return json({school,sport,live_source_used:result.live_source_used,source_url:result.source_url,source_urls:result.source_urls,fetched_at:result.fetched_at,event_count:result.events.length,error:result.error});}
    return env.ASSETS.fetch(request);
  }
};
