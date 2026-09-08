import schools from './schools.json';

const VERSION='3.8.0';
const FEED_FRESH_MS=5*60*1000;
const FEED_STALE_MS=24*60*60*1000;
const HEADERS={
  'User-Agent':`Mozilla/5.0 (compatible; SAS-Sports/${VERSION}; Cloudflare-Worker)`,
  'Accept':'text/html,application/xhtml+xml'
};

const SPORT_PATHS={
  'Football':['football'],'Volleyball':['womens-volleyball','wvball','volleyball'],
  "Women's Volleyball":['womens-volleyball','volleyball'],"Men's Volleyball":['mens-volleyball','volleyball'],
  'Soccer':['womens-soccer','wsoc','soccer','mens-soccer'],"Women's Soccer":['womens-soccer','soccer'],"Men's Soccer":['mens-soccer','soccer'],
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
  'kansas|Volleyball':'https://kuathletics.com/sports/wvball/schedule',
  'kansas|Soccer':'https://kuathletics.com/sports/wsoc/schedule',
  'kansas|Cross Country':'https://kuathletics.com/sports/cross-country/schedule',
  'kansas|Track & Field':'https://kuathletics.com/sports/track-and-field/schedule',
  'kansas|Football':'https://kuathletics.com/sports/football/schedule',
  'florida|Volleyball':'https://floridagators.com/sports/womens-volleyball/schedule',
  'florida|Soccer':'https://floridagators.com/sports/womens-soccer/schedule',
  'florida|Cross Country':'https://floridagators.com/sports/cross-country/schedule',
  'florida|Track & Field':'https://floridagators.com/sports/track-and-field/schedule',
  'florida|Football':'https://floridagators.com/sports/football/schedule',
  'arizona|Volleyball':'https://arizonawildcats.com/sports/womens-volleyball/schedule',
  'arizona|Soccer':'https://arizonawildcats.com/sports/womens-soccer/schedule',
  'arizona|Cross Country':'https://arizonawildcats.com/sports/cross-country/schedule',
  'arizona|Football':'https://arizonawildcats.com/sports/football/schedule',
  'arizona-state|Volleyball':'https://thesundevils.com/sports/volleyball/schedule',
  'arizona-state|Soccer':'https://thesundevils.com/sports/soccer/schedule',
  'arizona-state|Cross Country':'https://thesundevils.com/sports/cross-country/schedule',
  'arizona-state|Football':'https://thesundevils.com/sports/football/schedule',
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
function decodeHtml(s){if(s==null)return'';return String(s).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');}
function visibleText(raw){if(raw==null)return'';return clean(decodeHtml(raw).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '))||'';}
function sportMatches(a,b){const n=s=>String(s).toLowerCase().replace(/\b(men's|women's|mens|womens)\b/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim();a=n(a);b=n(b);return a===b||a.includes(b)||b.includes(a);}
function rosterUrls(school,sport){
  const base=school.athletics_url.replace(/\/$/,'');
  return[...new Set((SPORT_PATHS[sport]||[slug(sport)]).map(p=>`${base}/sports/${p}/roster`))];
}
function dailyRank(value){
  const day=new Date().toISOString().slice(0,10);let h=2166136261;
  for(const ch of `${day}|${value}`){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return h>>>0;
}
function rosterPayloadImages(raw,base){
  // WMT sends roster portraits inside its embedded application payload while
  // the server-rendered <img> contains only a transparent lazy-load placeholder.
  const text=String(raw||'').replace(/\\u002F/gi,'/').replace(/\\u0026/gi,'&').replace(/\\\//g,'/');
  const images=new Map();let m;
  const re=/"([^"]+\.(?:jpe?g|png|webp|avif))","(https?:\/\/[^"]+\.(?:jpe?g|png|webp|avif)(?:\?[^"]*)?)"/gi;
  while((m=re.exec(text))){
    const key=slug(decodeHtml(m[1]).replace(/\.[^.]+$/,''));
    const url=absoluteUrl(m[2],base);
    if(key&&url&&!/(?:logo|placeholder|default|favicon|icon|brand|pitchfork|powercat|sport[_-]?mark)/i.test(decodeURIComponentSafe(url)))images.set(key,url);
  }
  return images;
}
function decodeURIComponentSafe(value){try{return decodeURIComponent(value)}catch{return String(value||'')}}
function rosterProfiles(raw,base){
  const byUrl=new Map(),payloadImages=rosterPayloadImages(raw,base);let m;
  // Capture the complete roster href first. Validating inside this expression
  // allowed a staff URL like /roster/season/2026/staff/name to be truncated to
  // /roster/season/2026 and incorrectly accepted as an athlete profile.
  const re=/<a\b[^>]*href=["']([^"']*\/sports\/[^"']+\/roster\/[^"'?#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  const nameScore=name=>{
    if(!name||name.length>80||/^(?:jersey\s+number\s+)?\d+$/i.test(name))return-1;
    let score=/^[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+)+$/.test(name)?10:0;
    if(/jersey|number|image|photo/i.test(name))score-=10;
    return score;
  };
  while((m=re.exec(raw))){
    const url=absoluteUrl(m[1],base),name=visibleText(m[2]);if(!url)continue;
    const path=new URL(url).pathname;
    // Only real player profile shapes are eligible. This rejects seasonal
    // roster pages and staff/coach profiles even when their URLs are nested.
    if(/\/(?:staff|coaches)\//i.test(path))continue;
    if(!/\/roster\/(?:player\/[^/]+|[^/]+\/\d+)\/?$/i.test(path))continue;
    const previous=byUrl.get(url);
    const image_url=payloadImages.get(slug(name))||athleteImage(m[2],base,name,true)||previous?.image_url||null;
    // SIDEARM often publishes the portrait and the visible athlete name in two
    // separate anchors that share the same profile URL. Keep an image-only
    // anchor long enough to join it to the later name anchor.
    if(!previous&&image_url)byUrl.set(url,{name:'',url,image_url});
    else if(nameScore(name)>nameScore(previous?.name))byUrl.set(url,{name,url,image_url});
    else if(previous&&!previous.image_url&&image_url)byUrl.set(url,{...previous,image_url});
  }
  return[...byUrl.values()].filter(x=>nameScore(x.name)>0);
}
function athleteImage(raw,base,name,trustedContainer=false){
  const candidates=[];
  const add=(value,score=0)=>{
    const url=absoluteUrl(value,base);if(!url)return;
    if(!/^https?:/i.test(url))return;
    const decoded=decodeHtml(url);
    if(/(?:logo|placeholder|default|favicon|icon|brand|pitchfork|sport[_-]?mark)/i.test(decoded)||/\.svg(?:$|\?)/i.test(decoded))return;
    candidates.push({url,score});
  };
  // Prefer Schema.org Person data because it binds the full athlete name and
  // portrait URL in the same official record, independent of visual layout.
  const wantedName=matchText(name);let schemaMatch;
  const schemas=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const visitSchema=value=>{
    if(!value||typeof value!=='object')return null;
    if(String(value['@type']||'').toLowerCase()==='person'&&matchText(value.name)===wantedName){
      const image=typeof value.image==='string'?value.image:value.image?.url;
      if(image)return absoluteUrl(image,base);
    }
    for(const child of Array.isArray(value)?value:Object.values(value)){const found=visitSchema(child);if(found)return found}
    return null;
  };
  while((schemaMatch=schemas.exec(raw))){
    try{const schemaImage=visitSchema(JSON.parse(decodeHtml(schemaMatch[1])));if(schemaImage)add(schemaImage,50)}catch{}
  }
  const identityMatch=(url='',alt='')=>{
    const tokens=String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(x=>x.length>1);
    const haystack=`${decodeHtml(url)} ${decodeHtml(alt)}`.toLowerCase().replace(/[^a-z0-9]+/g,' ');
    return tokens.length>=2&&tokens.every(token=>haystack.includes(token));
  };
  let m;
  // Next-generation SIDEARM profile pages explicitly mark the athlete's own
  // biography portrait. Prefer it over the surrounding roster thumbnail rail.
  const bioPortrait=raw.match(/c-rosterbio__player__image[^>]*>[\s\S]{0,1200}?<img\b([^>]*)>/i);
  if(bioPortrait){
    const attrs=bioPortrait[1],rawSrc=(attrs.match(/(?:src|data-src|srcset|data-srcset)=["']([^"']+)/i)||[])[1];
    const src=rawSrc?.split(',')[0]?.trim()?.split(/\s+/)[0];
    add(src,30);
  }
  const meta=/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)|<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/gi;
  while((m=meta.exec(raw))){const src=m[1]||m[2];if(identityMatch(src))add(src,1)}
  const wanted=String(name||'').toLowerCase().split(/\s+/).filter(Boolean);
  const imgs=/<img\b([^>]*)>/gi;
  while((m=imgs.exec(raw))){
    const attrs=m[1],rawSrc=(attrs.match(/(?:src|data-src|srcset|data-srcset)=["']([^"']+)/i)||[])[1];
    const src=rawSrc?.split(',')[0]?.trim()?.split(/\s+/)[0],alt=decodeHtml((attrs.match(/alt=["']([^"']*)/i)||[])[1]||'').toLowerCase();
    if(!trustedContainer&&!identityMatch(src,alt))continue;
    let score=trustedContainer?10:/(?:headshot|roster|player|athlete|bio)/i.test(attrs)?5:0;
    if(wanted.length&&wanted.every(part=>alt.includes(part)))score+=10;
    add(src,score);
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates[0]?.url||null;
}
function verifiedInstagram(raw){
  let m;const re=/<a\b[^>]*href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?#\s]+)[^"']*["'][^>]*>/gi;
  while((m=re.exec(raw))){
    try{
      const u=new URL(decodeHtml(m[1])),parts=u.pathname.split('/').filter(Boolean);
      const handle=(parts[0]||'').toLowerCase();
      if(parts.length===1&&handle&&!['kstatesports','explore','accounts','p','reel','reels'].includes(handle))return`https://www.instagram.com/${parts[0]}/`;
    }catch{}
  }
  return null;
}
async function featuredAthletes(schoolId,sport){
  const school=schools.find(s=>s.id===schoolId);if(!school)return[];
  let profiles=[];
  for(const rosterUrl of rosterUrls(school,sport)){
    try{const r=await fetch(rosterUrl,{headers:HEADERS,redirect:'follow'});if(!r.ok)continue;profiles=rosterProfiles(await r.text(),r.url||rosterUrl);if(profiles.length)break}catch{}
  }
  // Roster-card portraits are the most reliable source. Put those athletes
  // first, then retain the daily shuffle within each group.
  profiles.sort((a,b)=>Number(Boolean(b.image_url))-Number(Boolean(a.image_url))||dailyRank(a.url)-dailyRank(b.url));
  const found=[];
  // Check enough roster profiles to produce three real portraits. Newly added
  // athletes sometimes publish a school logo as their social image until a
  // headshot is uploaded, so those generic images must not occupy a photo card.
  await Promise.all(profiles.slice(0,9).map(async profile=>{
    try{
      const r=await fetch(profile.url,{headers:HEADERS,redirect:'follow'});if(!r.ok)return;
      const html=await r.text(),instagram_url=verifiedInstagram(html);
      found.push({name:profile.name,instagram_url,profile_url:profile.url,image_url:athleteImage(html,r.url||profile.url,profile.name)||profile.image_url});
    }catch{}
  }));
  // Final publisher-independent guard. Every portrait source—roster HTML,
  // embedded payload, profile markup, or Schema.org—must pass this check.
  for(const athlete of found)if(athlete.image_url&&/(?:logo|placeholder|default|favicon|icon|brand|pitchfork|powercat|sport[_-]?mark)/i.test(decodeURIComponentSafe(athlete.image_url)))athlete.image_url=null;
  // Global identity guard: one portrait cannot represent different athletes.
  // If a publisher supplies a shared page image, use safe initials instead.
  const imageOwners=new Map();
  for(const athlete of found){if(!athlete.image_url)continue;const key=athlete.image_url.replace(/[?#].*$/,'');if(!imageOwners.has(key))imageOwners.set(key,[]);imageOwners.get(key).push(athlete)}
  for(const owners of imageOwners.values())if(new Set(owners.map(x=>x.name)).size>1)for(const athlete of owners)athlete.image_url=null;
  const ranked=found.sort((a,b)=>dailyRank(a.name)-dailyRank(b.name));
  const photographed=ranked.filter(a=>a.image_url);
  return photographed.length>=3?photographed.slice(0,3):[...photographed,...ranked.filter(a=>!a.image_url)].slice(0,3);
}
function candidateUrls(school,sport){const known=KNOWN_URLS.get(`${school.id}|${sport}`);if(known)return[known];const out=[],base=school.athletics_url.replace(/\/$/,'');for(const p of (SPORT_PATHS[sport]||[slug(sport)]))out.push(`${base}/sports/${p}/schedule`);out.push(`${base}/`);return[...new Set(out)];}
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
      'Iowa’s Reilly Heman equalized in the 50th minute, assisted by Berit Parten.',
      'Maddie Sibbing tied her collegiate career high with eight saves.',
      'The draw extended K-State’s school-record unbeaten streak to seven matches.'
    ],
    stats:[
      {label:'Shots',value:'K-State 11 · Iowa 25'},
      {label:'Shots on goal',value:'K-State 5 · Iowa 9'},
      {label:'Saves',value:'K-State 8 · Iowa 4'},
      {label:'Corners',value:'K-State 4 · Iowa 7'}
    ]
  },
  'kstate|Soccer|2026-08-30|nebraska':{
    source_url:'https://www.kstatesports.com/news/2026/8/30/soccer-k-state-nebraska-play-to-draw-on-sunday-night',
    highlights:[
      'K-State and Nebraska finished in a scoreless draw.',
      'Maddie Sibbing saved a Nebraska penalty kick in the 67th minute.',
      'Sibbing made six saves and recorded her school-record 12th career shutout.',
      'The result extended K-State’s school-record unbeaten streak to six matches.'
    ],
    stats:[
      {label:'Shots',value:'K-State 12 · Nebraska 15'},
      {label:'Shots on goal',value:'K-State 3 · Nebraska 6'},
      {label:'Saves',value:'K-State 6 · Nebraska 3'},
      {label:'Corners',value:'K-State 1 · Nebraska 9'}
    ]
  },
  'kstate|Soccer|2026-08-23|south-dakota-state':{
    source_url:'https://www.kstatesports.com/news/2026/8/23/https-www-kstatesports-com-documents-2026-8-14-2026-27-k-state-soccer-3-pdf',
    highlights:[
      'South Dakota State went down a player after its goalkeeper received a red card in the 20th minute.',
      'Langley Mayers opened the scoring in the 29th minute, assisted by Rilyn Rintoul and Chloe Dillbeck.',
      'Gabby DeMers added K-State’s second goal in the 52nd minute from Lauren Moylan and Mayers assists.',
      'Maddie Sibbing earned her school-record 11th career shutout and tied the K-State record with 11 career wins.',
      'K-State outshot South Dakota State 22-5 and allowed only one shot on goal.'
    ],
    stats:[
      {label:'Shots',value:'K-State 22 · South Dakota State 5'},
      {label:'Shots on goal',value:'K-State 8 · South Dakota State 1'},
      {label:'Saves',value:'K-State 1 · South Dakota State 6'},
      {label:'Corners',value:'K-State 2 · South Dakota State 3'}
    ]
  },
  'kstate|Soccer|2026-08-13|seattle-u':{
    source_url:'https://www.kstatesports.com/news/2026/8/13/soccer-k-state-thumps-seattle-u-in-2026-season-opener',
    highlights:[
      'McKinnan Braswell headed in Rilyn Rintoul’s cross in the 12th minute for the eventual game-winner.',
      'Rintoul scored from her own rebound in the 23rd minute after assisting the opening goal.',
      'Freshmen Lauren Moylan and Kennedy Miller scored their first collegiate goals seven minutes apart in the second half.',
      'K-State’s four goals tied the program record for goals in a season opener.',
      'The Wildcats held a 14-9 advantage in shots and put eight attempts on goal.'
    ],
    stats:[
      {label:'Shots',value:'K-State 14 · Seattle U. 9'},
      {label:'Shots on goal',value:'K-State 8 · Seattle U. 3'},
      {label:'Saves',value:'K-State 3 · Seattle U. 4'},
      {label:'Corners',value:'K-State 4 · Seattle U. 6'}
    ]
  },
  'kstate|Soccer|2026-08-20|missouri-state':{
    source_url:'https://www.kstatesports.com/news/2026/8/20/soccer-k-state-registers-home-shutout-win-in-2026-home-opener',
    highlights:[
      'McKinnan Braswell scored the game-winner in the sixth minute from a Rilyn Rintoul assist.',
      'Rilyn Rintoul doubled the lead in the 58th minute, assisted by Gabby DeMers.',
      'Kennedy Miller completed the scoring in the 76th minute.',
      'K-State dominated the shot count 32-2 and tied its school record with 13 shots on goal.',
      'Maddie Sibbing’s shutout tied the K-State career record with her 10th.'
    ],
    stats:[
      {label:'Shots',value:'K-State 32 · Missouri State 2'},
      {label:'Shots on goal',value:'K-State 13 · Missouri State 1'},
      {label:'Saves',value:'K-State 1 · Missouri State 10'},
      {label:'Corners',value:'K-State 11 · Missouri State 1'}
    ]
  }
}));
function enrichGameEvent(event){
  if(event.event_type!=='GAME'||event.status!=='Final')return event;
  const detail=VERIFIED_GAME_DETAILS.get(`${event.school_id}|${event.sport}|${event.start_time?.slice(0,10)||''}|${slug(event.opponent||'')}`);
  if(!detail)return event;
  event.highlights=detail.highlights;
  event.highlights_verified=true;
  event.game_stats=detail.stats;
  event.recap_url=detail.source_url;
  event.source={...event.source,name:'Official athletics game recap',url:detail.source_url};
  return event;
}
function enrichMeetEvent(event,date){
  if(event.event_type!=='MEET'||event.status!=='Final')return event;
  const detail=VERIFIED_MEET_DETAILS.get(`${event.school_id}|${event.sport}|${event.start_time?.slice(0,10)||''}|${slug(event.opponent||'')}`);
  if(detail){
    event.results=detail.rows;
    event.highlights=[
      "K-State swept both team championships, with the women scoring 20 points and the men finishing one point better at 19.",
      "Max Larson led a commanding 1-2-3 men’s finish, winning the 6K in 18:27.2 ahead of Jackson Esquibel and Brock Olsen.",
      "Emma Baum’s 17:41.9 runner-up performance started a five-runner K-State women’s pack that captured places two through six.",
      "The Wildcat men placed five runners inside the top eight, while all six leading K-State women crossed among the first eight finishers."
    ];
    event.highlights_verified=true;
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
function parseSidearmGameCards(raw,school,sport,sourceUrl,now){
  const starts=[...raw.matchAll(/<div\b[^>]*data-test-id=["']s-game-card-standard__root["'][^>]*>/gi)].map(x=>x.index),events=[];
  const year=Number((visibleText(raw).match(/\b(20\d{2})\s+[^.]{0,40}\bSchedule\b/i)||[])[1])||now.getUTCFullYear();
  for(let i=0;i<starts.length;i++){
    const block=raw.slice(starts[i],starts[i+1]||Math.min(raw.length,starts[i]+60000));
    const opponentLink=visibleText((block.match(/<a\b[^>]*data-test-id=["']s-game-card-standard__header-team-opponent-link["'][^>]*>([\s\S]*?)<\/a>/i)||[])[1]);
    const meetName=visibleText((block.match(/data-test-id=["']s-game-card-standard__header-team-event-info["'][^>]*>[\s\S]{0,1200}?<p\b[^>]*>([\s\S]*?)<\/p>/i)||[])[1]);
    const opponent=opponentLink||meetName;
    const dateText=visibleText((block.match(/data-test-id=["']s-game-card-standard__header-game-date(?:-details)?["'][^>]*>([\s\S]*?)<\/span>|data-test-id=["']s-game-card-standard__header-game-date["'][^>]*>([\s\S]*?)<\/p>/i)||[]).slice(1).find(Boolean));
    if(!opponent||!dateText)continue;
    const relation=(visibleText((block.match(/<span\b[^>]*class=["'][^"']*s-stamp__text[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)||[])[1])||(eventType(sport)==='MEET'?'at':'vs')).toLowerCase()==='at'?'at':'vs';
    const result=visibleText((block.match(/data-test-id=["']s-game-card-standard__header-game-team-score["'][^>]*>([\s\S]*?)<\/span>/i)||block.match(/data-test-id=["']s-game-card-standard__header-game-pre-score["'][^>]*>([\s\S]*?)<\/span>/i)||[])[1]);
    // New SIDEARM cards render outcomes as "W Win 70-7", "L Loss 1-3",
    // "T Tie 1-1", or "D Draw 0-0". Accept both the short marker and the
    // expanded word so completed games are never mistaken for upcoming ones.
    const score=result?.match(/\b([WLTD])\b(?:\s*,?\s*(?:Win|Loss|Tie|Draw))?\s*,?\s*(\d+)\s*[-–]\s*(\d+)/i);
    const status=score||(eventType(sport)==='MEET'&&result)?'Final':'Upcoming';
    const date=`${dateText.replace(/\([^)]*\)/g,'').trim()}, ${year}`;
    events.push(makeEvent({school,sport,status,relation,opponent,date,time:null,schoolScore:score?.[2]||null,oppScore:score?.[3]||null,resultText:result,sourceUrl,now}));
  }
  return events;
}
function parseWmtScheduleCards(raw,school,sport,sourceUrl,now){
  const starts=[...raw.matchAll(/<div\b[^>]*class=["'][^"']*\bschedule-event-item(?=\s|["'])[^"']*["'][^>]*>/gi)].map(x=>x.index),events=[];
  const year=Number((visibleText(raw).match(/\b(20\d{2})\s+[^.]{0,40}\bSchedule\b/i)||[])[1])||now.getUTCFullYear();
  for(let i=0;i<starts.length;i++){
    const block=raw.slice(starts[i],starts[i+1]||Math.min(raw.length,starts[i]+60000));
    const opening=(block.match(/^<div\b[^>]*>/i)||[])[0]||'';
    const completed=/schedule-event-item--completed/i.test(opening);
    const dateBox=(block.match(/schedule-event-grid-date-mobile__box[^>]*>([\s\S]{0,700}?)<\/strong>/i)||[])[1];
    const dateParts=[...(dateBox||'').matchAll(/<time\b[^>]*>([\s\S]*?)<\/time>/gi)].map(x=>visibleText(x[1]));
    const nameMatch=block.match(/schedule-default-event__name[^>]*>\s*<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]{0,500}?)<\/strong>/i);
    const relation=visibleText(nameMatch?.[1]).toLowerCase().startsWith('at')?'at':'vs';
    const opponent=visibleText(nameMatch?.[2]);
    if(dateParts.length<2||!opponent)continue;
    const rawResult=visibleText((block.match(/schedule-event-grid-result__label[^>]*>([\s\S]{0,900}?)<\/strong>/i)||[])[1]);
    // WMT sometimes places the numeric score outside the result-label <strong>.
    // Search the complete event card as a fallback so "T Tie" and "L Loss"
    // cannot survive while their adjacent 1-1 or 0-1 score is discarded.
    const scoreText=rawResult||visibleText(block);
    const score=scoreText.match(/\b([WLTD])\b\s*(?:Win|Loss|Tie|Draw)?\s*,?\s*(\d+)\s*[-–]\s*(\d+)/i)
      ||visibleText(block).match(/\b([WLTD])\b\s*(?:Win|Loss|Tie|Draw)?\s*,?\s*(\d+)\s*[-–]\s*(\d+)/i);
    const result=score?`${score[1].toUpperCase()}, ${score[2]}-${score[3]}`:(completed?(rawResult||'Completed'):null);
    const date=`${dateParts[0]} ${dateParts[1]}, ${year}`;
    const event=makeEvent({school,sport,status:completed?'Final':'Upcoming',relation,opponent,date,time:null,schoolScore:score?.[2]||null,oppScore:score?.[3]||null,resultText:result,sourceUrl,now});
    // Preserve the recap attached to this exact WMT schedule card. Some schools
    // publish after midnight, so the article URL can be dated one day later.
    const recapLink=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*?\bRecap\b(?:(?!<\/a>)[\s\S])*?)<\/a>/i);
    const cardRecap=recapLink?absoluteUrl(recapLink[1],sourceUrl):null;
    if(cardRecap)event.recap_url=cardRecap;
    events.push(event);
  }
  return events;
}
function parseSchemaEvents(raw,school,sport,sourceUrl,now){
  const events=[];let m;
  const re=/\{[^{}]{0,500}"@type":"Event"[\s\S]{0,2500}?"name":"([^"]+)"[\s\S]{0,1200}?"startDate":"(20\d{2}-\d{2}-\d{2})[^"}]*"/gi;
  while((m=re.exec(raw))){
    const name=decodeHtml(m[1]),dateObj=new Date(`${m[2]}T12:00:00Z`);
    if(dateObj.getTime()<now.getTime()-86400000)continue;
    const relation=/\sat\s/i.test(name)?'at':'vs',opponent=clean(name.split(/\s+(?:vs\.|vs|at)\s+/i).slice(1).join(' '));
    if(!opponent)continue;
    const date=dateObj.toLocaleDateString('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'});
    events.push(makeEvent({school,sport,status:'Upcoming',relation,opponent,date,time:null,schoolScore:null,oppScore:null,resultText:null,sourceUrl,now}));
  }
  return events;
}
function parseHtml(raw,school,sport,sourceUrl,now=new Date()){
  // Athletics sites routinely combine old and new widgets during redesigns.
  // Run every platform adapter and merge normalized events; never stop after the
  // first parser returns a partial schedule.
  const eventLists=[];
  eventLists.push(extractEventLabels(raw).map(label=>parseLabel(label,school,sport,sourceUrl,now)).filter(Boolean));
  const sourceAdapters=[
    {name:'sidearm',parse:parseSidearmGameCards},
    {name:'wmt',parse:parseWmtScheduleCards},
    {name:'schema',parse:parseSchemaEvents}
  ];
  for(const adapter of sourceAdapters)eventLists.push(adapter.parse(raw,school,sport,sourceUrl,now));
  const events=mergeEvents(eventLists),rank={Live:0,Today:1,Upcoming:2,Final:3,Unknown:4};
  return events.sort((a,b)=>{const r=(rank[a.status]??4)-(rank[b.status]??4);if(r)return r;const ta=a.start_time?Date.parse(a.start_time):0,tb=b.start_time?Date.parse(b.start_time):0;return a.status==='Final'?tb-ta:ta-tb;});
}
function eventMergeKey(e){const day=e.start_time?e.start_time.slice(0,10):'';return`${e.school_id}|${e.sport}|${slug(e.opponent||'')}|${day}`;}
function mergeEvents(eventLists){const statusWeight={Unknown:0,Upcoming:1,Today:2,Live:3,Final:4},byKey=new Map();for(const events of eventLists)for(const e of events){const key=eventMergeKey(e),prev=byKey.get(key);if(!prev){byKey.set(key,e);continue;}const ew=statusWeight[e.status]??0,pw=statusWeight[prev.status]??0,ed=(e.school_score&&e.opponent_score?2:0)+(e.result_count||0)+(e.highlights?.length||0)*2+(e.recap_url?2:0),pd=(prev.school_score&&prev.opponent_score?2:0)+(prev.result_count||0)+(prev.highlights?.length||0)*2+(prev.recap_url?2:0);if(ew>pw||(ew===pw&&ed>pd))byKey.set(key,e);}return[...byKey.values()];}
function inSeason(sport,month){const windows=SEASONS[sport];if(!windows)return true;return windows.some(([a,b])=>a<=b?month>=a&&month<=b:month>=a||month<=b);}
function groupEvents(events,now=new Date()){if(!events.length)return[];const sport=events[0].sport;events=filterActiveSeason(events,sport,now);if(!events.length)return[];const school=events[0],live=[],results=[],upcoming=[],other=[];for(const e of events){if(e.status==='Live')live.push(e);else if(e.status==='Final')results.push(e);else if(e.status==='Upcoming'||e.status==='Today')upcoming.push(e);else other.push(e);}results.sort((a,b)=>(Date.parse(b.start_time)||0)-(Date.parse(a.start_time)||0));upcoming.sort((a,b)=>(Date.parse(a.start_time)||Infinity)-(Date.parse(b.start_time)||Infinity));const active=inSeason(sport,now.getUTCMonth()+1),latest=results.map(e=>e.start_time).filter(Boolean).sort().at(-1)||null,next=upcoming.map(e=>e.start_time).filter(Boolean).sort()[0]||null;return[{school_id:school.school_id,school:school.school,sport,in_season:active,season_label:active?'In season':'Out of season',live,results,upcoming,other,latest_activity_at:latest,next_activity_at:next}];}
function absoluteUrl(href,base){try{return new URL(decodeHtml(href),base).href}catch{return null}}
function recapUrlsByEvent(raw,school,sport,sourceUrl,now){
  const map=new Map(),markers=[],seenMarker=new Set();
  const addMarker=(label,index,length)=>{
    const event=parseLabel(visibleText(label),school,sport,sourceUrl,now);
    if(!event||event.status!=='Final')return;
    const id=`${eventMergeKey(event)}|${index}`;
    if(!seenMarker.has(id)){seenMarker.add(id);markers.push({event,index,end:index+length});}
  };
  let m;
  const attr=/(?:aria-label|title)\s*=\s*["']([^"']*Completed Event:[^"']*)["']/gi;
  while((m=attr.exec(raw)))addMarker(m[1],m.index,m[0].length);
  const heading=/<h[1-6]\b[^>]*>([\s\S]*?Completed Event:[\s\S]*?)<\/h[1-6]>/gi;
  while((m=heading.exec(raw)))addMarker(m[1],m.index,m[0].length);
  markers.sort((a,b)=>a.index-b.index);
  for(let i=0;i<markers.length;i++){
    const marker=markers[i],next=markers.find(x=>x.index>marker.index);
    const block=raw.slice(marker.end,Math.min(next?.index||raw.length,marker.end+40000));
    const link=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?\bRecap\b[\s\S]*?)<\/a>/i);
    const recapUrl=link?absoluteUrl(link[1],sourceUrl):null;
    if(recapUrl)map.set(eventMergeKey(marker.event),recapUrl);
  }
  const candidates=[] ,seenCandidates=new Set(map.values());
  const anyRecap=/<a\b[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*?\bRecap\b(?:(?!<\/a>)[\s\S])*?)<\/a>/gi;
  while((m=anyRecap.exec(raw))){
    const recapUrl=absoluteUrl(m[1],sourceUrl);
    if(recapUrl&&!seenCandidates.has(recapUrl)){seenCandidates.add(recapUrl);candidates.push(recapUrl);}
  }
  // K-State sometimes labels a final only as "Game Center" even when the official
  // recap exists in the sport's Related News. Include official dated news articles
  // as candidates; recapMatchesEvent still requires the exact sport, opponent and date.
  const newsLink=/<a\b[^>]*href=["']([^"']*\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'?#]+)[^"']*["'][^>]*>/gi;
  while((m=newsLink.exec(raw))){
    const articleUrl=absoluteUrl(m[1],sourceUrl);
    if(articleUrl&&!seenCandidates.has(articleUrl)){seenCandidates.add(articleUrl);candidates.push(articleUrl);}
  }
  return{map,candidates:[...map.values(),...candidates]};
}
function shortHighlight(text){
  let item=clean(text);if(!item)return null;
  const words=item.split(/\s+/);
  if(words.length>22||!/[.!?]$/.test(item))return null;
  return item;
}
function extractOfficialHighlights(raw){
  const items=[];
  const add=x=>{x=shortHighlight(visibleText(x));if(x&&x.length>=25&&!items.includes(x))items.push(x);};
  const meta=raw.match(/<meta\b[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']+)["']/i)
    ||raw.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["'](?:description|og:description)["']/i);
  if(meta)add(meta[1]);
  const hit=raw.search(/HOW IT HAPPENED/i);
  if(hit>=0){
    let section=raw.slice(hit,hit+30000);
    const stop=section.slice(20).search(/(?:QUICK FACTS|TEAM NOTES|PLAYER NOTES|UP NEXT|FROM THE HEAD COACH)/i);
    if(stop>=0)section=section.slice(0,stop+20);
    let m;const block=/<(?:li|p)\b[^>]*>([\s\S]*?)<\/(?:li|p)>/gi;
    while((m=block.exec(section))&&items.length<5)add(m[1]);
  }
  return items.slice(0,5);
}
function automaticFinalHighlights(e){
  const items=[];
  if(e.school_score!=null&&e.opponent_score!=null){
    const schoolScore=Number(e.school_score),opponentScore=Number(e.opponent_score);
    items.push(`Final score: ${e.school} ${e.school_score}, ${e.opponent} ${e.opponent_score}.`);
    if(Number.isFinite(schoolScore)&&Number.isFinite(opponentScore)){
      if(schoolScore===opponentScore)items.push(`The event finished tied at ${schoolScore}-${opponentScore}.`);
      else if(schoolScore>opponentScore){
        const margin=schoolScore-opponentScore;
        const unit=e.sport==='Soccer'?'goal':e.sport==='Volleyball'?'set':e.sport==='Baseball'||e.sport==='Softball'?'run':'point';
        items.push(`${e.school} earned the victory by ${margin} ${unit}${margin===1?'':'s'}.`);
        if(opponentScore===0)items.push(`${e.school} recorded a shutout.`);
        if(e.sport==='Volleyball'&&schoolScore===3&&opponentScore===0)items.push(`${e.school} completed a straight-set sweep.`);
      }else{
        const margin=opponentScore-schoolScore;
        const unit=e.sport==='Soccer'?'goal':e.sport==='Volleyball'?'set':e.sport==='Baseball'||e.sport==='Softball'?'run':'point';
        items.push(`${e.opponent} won by ${margin} ${unit}${margin===1?'':'s'}.`);
      }
    }
  }else if(e.headline)items.push(`Official result: ${e.headline}.`);
  else items.push(`${e.school} completed its ${e.sport} event against ${e.opponent||'the listed opponent'}.`);
  return items;
}
function matchText(s){return String(s||'').toLowerCase().replace(/\b(?:exhibition|neutral|rv|ranked)\b/g,' ').replace(/#[0-9]+|\([^)]+\)/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function opponentSchoolFor(event,currentSchool){
  const wanted=matchText(event.opponent);
  if(!wanted)return null;
  return schools.find(candidate=>candidate.id!==currentSchool.id&&[candidate.name,candidate.short_name,...(candidate.aliases||[])]
    .some(label=>{const value=matchText(label);return value===wanted||(value.length>3&&wanted.length>3&&(value.includes(wanted)||wanted.includes(value)));}))||null;
}
function recapMatchesEvent(raw,e,recapUrl=''){
  // Match against the article itself, not navigation or schedule widgets that can
  // contain unrelated opponents and dates.
  const title=(raw.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';
  const article=recapArticleText(raw);
  const text=matchText(`${title} ${article}`);
  const opponent=matchText(e.opponent);
  if(!opponent||!text.includes(opponent))return false;
  const sportName=matchText(e.sport);
  if(sportName&&!text.includes(sportName)&&!matchText(recapUrl).includes(sportName))return false;
  const day=e.start_time?.slice(0,10);
  if(day){
    const [year,month,date]=day.split('-').map(Number);
    const urlDate=new RegExp(`/news/${year}/0?${month}/0?${date}/`).test(recapUrl);
    const urlDateMatch=recapUrl.match(/\/news\/(20\d{2})\/(\d{1,2})\/(\d{1,2})\//);
    const articleDay=urlDateMatch?Date.UTC(Number(urlDateMatch[1]),Number(urlDateMatch[2])-1,Number(urlDateMatch[3])):NaN;
    const eventDay=Date.UTC(year,month-1,date);
    const adjacentPublication=Number.isFinite(articleDay)&&Math.abs(articleDay-eventDay)<=86400000;
    const names=['january','february','march','april','may','june','july','august','september','october','november','december'];
    const published=matchText((raw.match(/<meta\b[^>]*(?:property|name)=["'](?:article:published_time|date)["'][^>]*content=["']([^"']+)/i)||[])[1]||'');
    const dateText=matchText(`${names[month-1]} ${date} ${year}`);
    if(!urlDate&&!adjacentPublication&&!published.includes(matchText(day))&&!text.includes(dateText))return false;
  }
  return true;
}
function recapArticleText(raw){
  const bodyMatch=raw.match(/"articleBody"\s*:\s*("(?:\\.|[^"\\])*")/i);
  if(bodyMatch){try{return JSON.parse(bodyMatch[1]).slice(0,14000)}catch{}}
  // WMT stores article paragraphs in its embedded application payload instead
  // of articleBody or server-rendered <article> markup.
  const payloadParts=[];let payloadMatch;
  const payloadRe=/"content","((?:\\.|[^"\\]){80,})"/gi;
  while((payloadMatch=payloadRe.exec(raw))&&payloadParts.length<20){
    try{
      const decoded=JSON.parse(`"${payloadMatch[1]}"`);
      if(/<p\b|<br\b|<li\b/i.test(decoded))payloadParts.push(visibleText(decoded));
    }catch{}
  }
  const payloadText=clean(payloadParts.join(' '));
  if(payloadText&&payloadText.length>=80)return payloadText.slice(0,14000);
  const storyBody=(raw.match(/<div\b[^>]*id=["']storyPageContentBody["'][^>]*>([\s\S]*?)(?=<\/div>\s*<\/(?:div|section)>)/i)||[])[1];
  if(storyBody)return visibleText(storyBody).slice(0,14000);
  const article=(raw.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)||[])[1];
  if(!article)return'';
  const text=visibleText(article),hit=text.search(/HOW IT HAPPENED/i);
  return text.slice(hit>=0?hit:0,hit>=0?hit+12000:14000);
}
function highlightPriorities(sport){
  const s=matchText(sport);
  if(s.includes('football'))return'touchdowns, pivotal drives, turnovers, explosive plays, defensive stops, and records';
  if(s.includes('volleyball'))return'set swings, decisive runs, kills, hitting efficiency, blocks, aces, and match records';
  if(s.includes('soccer'))return'goals with minutes and assists, saves, disallowed goals, cards, shot pressure, and records';
  if(s.includes('cross country'))return'individual places and times, team scoring, winning margins, course records, and personal bests';
  if(s.includes('basketball'))return'decisive scoring runs, lead changes, clutch baskets, standout stat lines, rebounds, assists, and records';
  if(s.includes('baseball')||s.includes('softball'))return'scoring innings, go-ahead hits, home runs, pitching performances, defensive plays, and records';
  if(s.includes('track')||s.includes('swimming'))return'winning performances, times or marks, records, qualifying standards, relays, and team placement';
  if(s.includes('wrestling'))return'pivotal bouts, falls, technical falls, ranked wins, bonus points, and team-score swings';
  if(s.includes('tennis'))return'decisive singles and doubles matches, tiebreaks, clinching points, ranked wins, and comebacks';
  if(s.includes('golf'))return'round scores, leaderboard movement, birdie runs, individual placement, team placement, and records';
  if(s.includes('rowing'))return'boat classes, finish times, margins, heat progression, medal finishes, and team placement';
  return'decisive moments, standout participants, score changes, records, milestones, and sport-specific statistics';
}
async function generateAIHighlights(env,e,raw){
  if(e.highlights_verified)return{items:e.highlights,state:'verified'};
  if(!env?.AI)return{items:null,state:'binding_unavailable'};
  const article=recapArticleText(raw);
  if(article.length<80)return{items:null,state:'recap_text_unavailable'};
  const prompt=`Write exactly four engaging, factual highlights explaining how this ${e.sport} event unfolded.
Use only the official recap. Paraphrase; never copy. Each highlight must be one complete sentence of 16-36 words.
Prioritize ${highlightPriorities(e.sport)}. Include names, timing, score context and why the moment mattered when available.
Reject vague lines like "X scored," "Y won it," or "Team A outshot Team B."
Return four lines only, with each line beginning "- ".

Event: ${e.school} vs ${e.opponent}; date ${e.start_time?.slice(0,10)||''}; final ${e.school_score??''}-${e.opponent_score??''}
Official recap:
${article.slice(0,10000)}`;
  try{
    const request=env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',{
      messages:[{role:'user',content:prompt}],max_tokens:500,temperature:0.15
    });
    const out=await Promise.race([
      request,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Highlight generation timed out')),8000))
    ]);
    const response=String(out?.response??out?.result?.response??'').trim();
    let list=[];
    const start=response.indexOf('['),end=response.lastIndexOf(']');
    if(start>=0&&end>start){
      try{
        const parsed=JSON.parse(response.slice(start,end+1));
        list=Array.isArray(parsed)?parsed:(parsed?.highlights||[]);
      }catch{}
    }
    if(list.length<3){
      list=response.split(/\n+/)
        .map(x=>clean(x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,'').replace(/^["']|["',]+$/g,'')))
        .filter(x=>x&&/[.!?]$/.test(x));
    }
    if(list.length<3)list=response.match(/[^.!?\n]{25,}[.!?]/g)||[];
    const cleanItems=[...new Set(list.map(clean))].filter(x=>{
      if(!x||x.length>360||!/[.!?]$/.test(x))return false;
      const words=x.split(/\s+/).length;
      return words>=8&&words<=50;
    }).slice(0,4);
    return cleanItems.length>=3?{items:cleanItems,state:'recap_generated'}:{items:null,state:'insufficient_highlights'};
  }catch(error){
    return{items:null,state:'ai_failed',error:clean(error?.message||'AI request failed')?.slice(0,160)||'AI request failed'};
  }
}
async function attachOfficialHighlights(events,raw,school,sport,sourceUrl,now,env=null,aiTargetId=null){
  const target=events.find(e=>e.status==='Final'&&e.id===aiTargetId);
  if(!target||target.highlights_verified)return events;
  const recapIndex=recapUrlsByEvent(raw,school,sport,sourceUrl,now);
  const direct=target.recap_url||recapIndex.map.get(eventMergeKey(target));
  const day=target.start_time?.slice(0,10)||'';
  const datePath=day?new RegExp(`/news/${day.slice(0,4)}/0?${Number(day.slice(5,7))}/0?${Number(day.slice(8,10))}/`):null;
  const ordered=[direct,...recapIndex.candidates.filter(url=>datePath?.test(url)),...recapIndex.candidates].filter(Boolean);
  const candidates=[...new Set(ordered)].slice(0,8);
  let recapUrl=null,recapHtml=null;
  const tryCandidates=async urls=>{
    for(const candidate of urls){
      try{
        const r=await fetch(candidate,{headers:HEADERS,redirect:'follow'});
        if(!r.ok)continue;
        const html=await r.text();
        if(recapMatchesEvent(html,target,candidate))return{url:candidate,html};
      }catch{}
    }
    return null;
  };
  // The schedule's direct recap is almost always correct. Fetch candidates one at
  // a time and stop on the first exact match instead of downloading every article.
  const scheduledMatch=await tryCandidates(candidates);
  if(scheduledMatch){recapUrl=scheduledMatch.url;recapHtml=scheduledMatch.html;}
  // Some WMT schedules publish completed events before attaching their recap
  // links. The official sport-news archive already contains those recaps, so use
  // it as a same-domain fallback and still require exact opponent, sport and date.
  if(!recapUrl){
    try{
      const newsUrl=new URL(sourceUrl);
      const newsPath=newsUrl.pathname.replace(/\/schedule(?:\/.*)?$/i,'/news');
      if(newsPath!==newsUrl.pathname){
        newsUrl.pathname=newsPath;newsUrl.search='';
        const r=await fetch(newsUrl,{headers:HEADERS,redirect:'follow'});
        if(r.ok){
          const html=await r.text(),links=[];let m;
          const linkHtml=html.replace(/\\u002F/gi,'/').replace(/\\\//g,'/');
          const newsLink=/<a\b[^>]*href=["']([^"']*\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'?#]+)[^"']*["'][^>]*>/gi;
          const embeddedNews=/"(https?:\/\/[^"]+\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'?#]+)"/gi;
          const addNewsLink=value=>{const link=absoluteUrl(value,newsUrl.href);if(link&&datePath?.test(link)&&!links.includes(link))links.push(link);};
          while((m=newsLink.exec(linkHtml))){
            addNewsLink(m[1]);
          }
          while((m=embeddedNews.exec(linkHtml)))addNewsLink(m[1]);
          const newsMatch=await tryCandidates(links.slice(0,8));
          if(newsMatch){recapUrl=newsMatch.url;recapHtml=newsMatch.html;}
        }
      }
    }catch{}
  }
  // A school may publish a box score but no recap even though the opponent
  // published an official article. Check that opponent's official schedule as
  // a controlled fallback, still requiring the exact event date and teams.
  if(!recapUrl){
    const opponentSchool=opponentSchoolFor(target,school);
    if(opponentSchool){
      for(const opponentScheduleUrl of candidateUrls(opponentSchool,sport).slice(0,4)){
        try{
          const r=await fetch(opponentScheduleUrl,{headers:HEADERS,redirect:'follow'});if(!r.ok)continue;
          const html=await r.text(),index=recapUrlsByEvent(html,opponentSchool,sport,r.url||opponentScheduleUrl,now);
          const mirror={...target,school_id:opponentSchool.id,school:opponentSchool.short_name||opponentSchool.name,opponent:school.short_name||school.name};
          const directOpponent=index.map.get(eventMergeKey(mirror));
          const orderedOpponent=[directOpponent,...index.candidates.filter(url=>datePath?.test(url)),...index.candidates].filter(Boolean);
          const opponentMatch=await tryCandidates([...new Set(orderedOpponent)].slice(0,8));
          if(opponentMatch){recapUrl=opponentMatch.url;recapHtml=opponentMatch.html;break;}
        }catch{}
      }
    }
  }
  if(!recapUrl){
    // Never leave an unverified schedule-card link behind. The UI must not
    // offer a recap button unless that URL passed the exact event checks.
    delete target.recap_url;
    target.highlights=[];target.highlight_state='recap_not_found';
    target.highlight_status='An exact official recap could not be matched to this event.';
    return events;
  }
  target.recap_url=recapUrl;
  target.source={...target.source,name:target.event_type==='MEET'?'Official athletics meet recap':'Official athletics game recap',url:recapUrl,updated_at:now.toISOString()};
  const aiResult=await generateAIHighlights(env,target,recapHtml);
  target.highlight_state=aiResult.state;
  if(aiResult.error)target.highlight_error=aiResult.error;
  if(aiResult.items){
    target.highlights=aiResult.items;target.highlights_verified=true;target.highlight_status=null;
  }else{
    target.highlights=[];
    target.highlight_status='Verified recap highlights could not be generated. Use the official recap link for this event.';
  }
  return events;
}
async function fetchUrl(url,school,sport,now,env=null,aiTargetId=null){const r=await fetch(url,{headers:HEADERS,redirect:'follow'}),html=await r.text(),finalUrl=r.url||url,labels=extractEventLabels(html);let events=r.ok?parseHtml(html,school,sport,finalUrl,now):[];if(events.length&&aiTargetId)events=await attachOfficialHighlights(events,html,school,sport,finalUrl,now,env,aiTargetId);return{requested_url:url,url:finalUrl,http_status:r.status,ok:r.ok,content_length:html.length,label_count:labels.length,event_count:events.length,has_upcoming:/Upcoming Event:/i.test(decodeHtml(html)),has_completed:/Completed Event:/i.test(decodeHtml(html)),events};}
async function fetchLive(schoolId,sport,env=null,aiTargetId=null){
  const school=schools.find(s=>s.id===schoolId),now=new Date();
  if(!school)return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:'School not found'};
  const urls=candidateUrls(school,sport),errors=[],successful=[];
  // Candidate paths are fallbacks, not independent feeds. Stop after the first
  // usable official schedule instead of hammering every possible publisher URL.
  for(const url of urls){
    try{
      const item=await fetchUrl(url,school,sport,now,env,aiTargetId);
      if(item.ok&&item.events.length){successful.push(item);break}
      errors.push(`${item.url}: HTTP ${item.http_status}, labels ${item.label_count}, events ${item.event_count}`);
    }catch(error){errors.push(`${url}: ${error?.message||error?.name||'FetchError'}`)}
  }
  const events=mergeEvents(successful.map(x=>x.events));
  if(events.length)return{events,source_url:successful[0]?.url||null,source_urls:successful.map(x=>x.url),fetched_at:now.toISOString(),live_source_used:true,error:null};
  return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:errors.slice(-6).join('; ')||'No live source available'};
}
function feedCacheKey(url,school,sport){const key=new URL('/__sas_cache/feed',url.origin);key.searchParams.set('school',school);key.searchParams.set('sport',sport);return new Request(key.toString(),{method:'GET'});}
function cachedAge(response){const saved=Date.parse(response.headers.get('x-sas-fetched-at')||'');return Number.isFinite(saved)?Date.now()-saved:Infinity;}
function cacheResponse(response,state){const copy=new Response(response.body,response);copy.headers.set('x-sas-cache',state);copy.headers.set('access-control-expose-headers','x-sas-cache,x-sas-fetched-at');return copy;}
async function freshGroupedFeed(url,school,sport,env,cache,key){
  const result=await fetchLive(school,sport,env);
  if(!result.events.length)return null;
  const response=json(groupEvents(result.events)),stored=new Response(response.body,response);
  stored.headers.set('cache-control',`public, max-age=${Math.floor(FEED_STALE_MS/1000)}`);
  stored.headers.set('x-sas-fetched-at',result.fetched_at);
  await cache.put(key,stored.clone());return stored;
}
async function diagnostic(schoolId,sport){const school=schools.find(s=>s.id===schoolId),now=new Date();if(!school)return{version:VERSION,school:schoolId,sport,error:'School not found'};const rows=[];for(const url of candidateUrls(school,sport)){try{const r=await fetchUrl(url,school,sport,now);rows.push({requested_url:r.requested_url,url:r.url,http_status:r.http_status,ok:r.ok,content_length:r.content_length,label_count:r.label_count,event_count:r.event_count,has_upcoming:r.has_upcoming,has_completed:r.has_completed});}catch(e){rows.push({requested_url:url,error:e?.message||e?.name||'FetchError'});}}return{version:VERSION,school:schoolId,sport,checked_at:now.toISOString(),sources:rows};}
async function verification(schoolId,sport){const result=await fetchLive(schoolId,sport),g=groupEvents(result.events)[0]||null;return{version:VERSION,school:schoolId,sport,verified_at:result.fetched_at,live_source_used:result.live_source_used,source_urls:result.source_urls,error:result.error,counts:g?{live:g.live.length,results:g.results.length,upcoming:g.upcoming.length,other:g.other.length}:{live:0,results:0,upcoming:0,other:0},latest_result:g?.results?.[0]||null,next_event:g?.upcoming?.[0]||null};}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/web'){const assetRequest=url.pathname==='/web'?new Request(new URL('/index.html',url),request):request;const response=await env.ASSETS.fetch(assetRequest),headers=new Headers(response.headers);headers.set('cache-control','no-store, no-cache, must-revalidate');headers.set('pragma','no-cache');headers.set('expires','0');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
    if(url.pathname==='/api/status')return json({name:'SAS Sports API',version:VERSION,mode:'cloudflare-worker-live',web_live_mode:true,school_catalog_count:schools.length,web_path:'/'});
    if(url.pathname==='/schools'){let list=schools;const q=(url.searchParams.get('q')||'').toLowerCase(),conference=url.searchParams.get('conference'),state=url.searchParams.get('state');if(q)list=list.filter(s=>[s.id,s.name,s.short_name,...(s.aliases||[])].join(' ').toLowerCase().includes(q));if(conference)list=list.filter(s=>s.conference.toLowerCase()===conference.toLowerCase());if(state)list=list.filter(s=>s.state.toLowerCase()===state.toLowerCase());return json(list);}
    if(url.pathname==='/api/diagnostic'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);return json(await diagnostic(school,sport));}
    if(url.pathname==='/api/verify'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);return json(await verification(school,sport));}
    if(url.pathname==='/live/athletes'){
      const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');
      if(!school||!sport)return json({detail:'school and sport are required'},400);
      const cache=caches.default,versionedUrl=new URL(url);versionedUrl.searchParams.set('athlete_cache',VERSION);
      const cacheKey=new Request(versionedUrl.toString(),{method:'GET'});
      const cached=await cache.match(cacheKey);if(cached)return cached;
      const athletes=await featuredAthletes(school,sport),response=json(athletes),stored=new Response(response.body,response);
      const complete=athletes.length===3&&athletes.every(a=>a.image_url);
      stored.headers.set('cache-control',`public, max-age=${complete?21600:300}`);
      if(athletes.length)await cache.put(cacheKey,stored.clone());return stored;
    }
    if(url.pathname==='/live/highlights'){
      const school=url.searchParams.get('school'),sport=url.searchParams.get('sport'),eventId=url.searchParams.get('event_id');
      if(!school||!sport||!eventId)return json({detail:'school, sport and event_id are required'},400);
      const result=await fetchLive(school,sport,env,eventId),event=result.events.find(e=>e.id===eventId);
      if(!event)return json({detail:'Event not found'},404);
      const response=json(event),stored=new Response(response.body,response);
      // Highlights are event-specific and must be revalidated against the current
      // official recap every time the expanded card opens.
      stored.headers.set('cache-control','no-store, no-cache, must-revalidate');
      return stored;
    }
    if(url.pathname==='/live/feed/grouped'){
      const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);
      const cache=caches.default,key=feedCacheKey(url,school,sport),cached=await cache.match(key),force=url.searchParams.get('refresh')==='1';
      if(cached&&!force){
        const age=cachedAge(cached);
        if(age<=FEED_FRESH_MS)return cacheResponse(cached,'fresh');
        if(age<=FEED_STALE_MS){ctx?.waitUntil(freshGroupedFeed(url,school,sport,env,cache,key).catch(()=>null));return cacheResponse(cached,'stale-refreshing')}
      }
      const fresh=await freshGroupedFeed(url,school,sport,env,cache,key);
      if(fresh)return cacheResponse(fresh,'live');
      if(cached&&cachedAge(cached)<=FEED_STALE_MS)return cacheResponse(cached,'stale-fallback');
      return json({detail:{message:'Live source returned no usable events',fetched_at:new Date().toISOString(),error:'All official source candidates failed and no verified cache is available'}},502);
    }
    if(url.pathname==='/live/status'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);const result=await fetchLive(school,sport);return json({school,sport,live_source_used:result.live_source_used,source_url:result.source_url,source_urls:result.source_urls,fetched_at:result.fetched_at,event_count:result.events.length,error:result.error});}
    return env.ASSETS.fetch(request);
  }
};
