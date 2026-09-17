import schools from './schools.json';
import sponsoredSports from './sponsored-sports.json';
import {rosterSocialInstagrams} from './roster-socials.js';
import {extractText} from 'unpdf';

const VERSION='4.22.2-asu-xc-isolated';
const FEED_FRESH_MS=25*1000;
const FEED_STALE_MS=24*60*60*1000;
const HEADERS={
  'User-Agent':`Mozilla/5.0 (compatible; SAS-Sports/${VERSION}; Cloudflare-Worker)`,
  'Accept':'text/html,application/xhtml+xml',
  'Accept-Language':'en-US,en;q=0.9'
};

// Accounts verified through direct tags from an official school/team social
// account. These are explicit identity matches, not name-based guesses.
const VERIFIED_TEAM_TAG_INSTAGRAM=new Map(Object.entries({
  'kstate|Tennis|Mallory Renfro':'https://www.instagram.com/mallorymrenfro/',
  'kstate|Tennis|Maralgoo Chogsomjav':'https://www.instagram.com/maralgoo917/',
  'kstate|Tennis|Varvara Bernovich':'https://www.instagram.com/bernovich.varka/',
  'kansas|Cross Country|Emmah Jemutai':'https://www.instagram.com/emmah_jemutai/',
  'kansas|Cross Country|Mia Murray':'https://www.instagram.com/_mia.murray/',
  'kansas|Soccer|Sophie Dawe':'https://www.instagram.com/sophia.dawe/',
  'kansas|Soccer|Marit McLaughlin':'https://www.instagram.com/marit.mclaughlin/',
  'kansas|Soccer|Livvy Moore':'https://www.instagram.com/livvy.moore/',
  'kansas|Golf|Lyla Louderbaugh':'https://www.instagram.com/lyla_louderbaugh/',
  'kansas|Golf|Ebba Nordstedt':'https://www.instagram.com/ebbaanordstedt/',
  'kansas|Golf|Anna Wallin':'https://www.instagram.com/annawalliinn/',
  'oklahoma-state|Cross Country|Denis Kipngetich':'https://www.instagram.com/deniskipngetich604/',
  'oklahoma-state|Cross Country|Brian Musau':'https://www.instagram.com/brianmuangemusau/',
  'florida|Cross Country|Oussama Allaoui':'https://www.instagram.com/oussama__allaoui/',
  'florida|Cross Country|Keeghan Edwards':'https://www.instagram.com/keeghan.edwards/',
  'florida|Cross Country|Claire Stegall':'https://www.instagram.com/stegall.claire/',
  'byu|Soccer|Chelsea Peterson':'https://www.instagram.com/chelseapeterson__/',
  'byu|Soccer|Mia Goettsche':'https://www.instagram.com/mia.goettsche/',
  'byu|Soccer|Brynnli Tolbert':'https://www.instagram.com/brynnb09/'
  ,'cincinnati|Soccer|Tiana Campbell':'https://www.instagram.com/tianagcampbell/'
  ,'colorado|Football|Ben Finneseth':'https://www.instagram.com/ben.finneseth/'
  ,'houston|Tennis|Petja Drame':'https://www.instagram.com/petja.drame/'
  ,'houston|Tennis|Valeriia Krokhotina':'https://www.instagram.com/leriiakrokhotina/'
  ,'houston|Tennis|Iva Sepa':'https://www.instagram.com/sepa_iva/'
}));

const SPORT_PATHS={
  'Football':['football'],'Volleyball':['womens-volleyball','wvball','volleyball'],
  "Women's Volleyball":['womens-volleyball','volleyball'],"Men's Volleyball":['mens-volleyball','volleyball'],
  'Soccer':['womens-soccer','wsoc','soccer','mens-soccer'],"Women's Soccer":['womens-soccer','soccer'],"Men's Soccer":['mens-soccer','soccer'],
  'Cross Country':['cross-country'],'Track & Field':['track-and-field','track-field'],
  'Basketball':['mens-basketball','womens-basketball','basketball'],"Men's Basketball":['mens-basketball','basketball'],"Women's Basketball":['womens-basketball','basketball'],
  'Baseball':['baseball'],'Softball':['softball'],'Wrestling':['wrestling'],
  'Swimming & Diving':['womens-swimming-and-diving','mens-swimming-and-diving','womens-swimming-diving','mens-swimming-diving','swimming-and-diving','swimming-diving','swimming'],'Tennis':['womens-tennis','mens-tennis','tennis'],
  'Golf':['womens-golf','mens-golf','golf'],'Rowing':['womens-rowing','rowing'],'Lacrosse':['womens-lacrosse','mens-lacrosse','lacrosse'],
  'Field Hockey':['field-hockey'],'Hockey':['mens-ice-hockey','womens-ice-hockey','ice-hockey','hockey'],
  'Gymnastics':['womens-gymnastics','mens-gymnastics','gymnastics'],'Beach Volleyball':['beach-volleyball'],
  'Water Polo':['womens-water-polo','mens-water-polo','water-polo'],'Fencing':['fencing'],'Bowling':['bowling'],
  'Equestrian':['equestrian'],'Rifle':['rifle'],'Skiing':['skiing'],'Triathlon':['triathlon'],
  'Acrobatics & Tumbling':['acrobatics-tumbling','acrobatics-and-tumbling'],'STUNT':['stunt']
};
const COMBINED_TEAM_SPORTS=new Set(['Basketball','Swimming & Diving']);
const KNOWN_ROSTER_URLS=new Map(Object.entries({
  'alabama|Cross Country':'https://rolltide.com/sports/xctrack/roster',
  'alabama|Football':'https://rolltide.com/sports/football/roster',
  'alabama|Soccer':'https://rolltide.com/sports/womens-soccer/roster',
  'alabama|Track & Field':'https://rolltide.com/sports/xctrack/roster',
  'alabama|Volleyball':'https://rolltide.com/sports/womens-volleyball/roster',
  'byu|Cross Country':['https://byucougars.com/sports/mens-cross-country/roster','https://byucougars.com/sports/womens-cross-country/roster'],
  'byu|Soccer':'https://byucougars.com/sports/womens-soccer/roster',
  'byu|Volleyball':'https://byucougars.com/sports/womens-volleyball/roster',
  'byu|Football':'https://byucougars.com/sports/football/roster',
  'oklahoma-state|Cross Country':'https://okstate.com/sports/mxct/roster',
  'oklahoma-state|Track & Field':'https://okstate.com/sports/mxct/roster'
  ,'colorado|Cross Country':'https://cubuffs.com/sports/cross-country/roster'
  ,'colorado|Soccer':'https://cubuffs.com/sports/womens-soccer/roster'
  ,'colorado|Volleyball':'https://cubuffs.com/sports/womens-volleyball/roster'
  ,'colorado|Football':'https://cubuffs.com/sports/football/roster'
  ,'houston|Cross Country':'https://uhcougars.com/sports/cross-country/roster'
  ,'houston|Soccer':'https://uhcougars.com/sports/womens-soccer/roster'
  ,'houston|Volleyball':'https://uhcougars.com/sports/womens-volleyball/roster'
  ,'houston|Football':'https://uhcougars.com/sports/football/roster'
  ,'houston|Tennis':'https://uhcougars.com/sports/womens-tennis/roster'
  ,'iowa-state|Cross Country':'https://cyclones.com/sports/cross-country/roster'
  ,'iowa-state|Soccer':'https://cyclones.com/sports/womens-soccer/roster'
  ,'iowa-state|Volleyball':'https://cyclones.com/sports/womens-volleyball/roster'
  ,'iowa-state|Football':'https://cyclones.com/sports/football/roster'
  ,'iowa-state|Swimming & Diving':'https://cyclones.com/sports/womens-swimming-and-diving/roster'
  ,'iowa-state|Tennis':'https://cyclones.com/sports/womens-tennis/roster'
  ,'tcu|Cross Country':'https://gofrogs.com/sports/cross-country/roster'
  ,'tcu|Soccer':'https://gofrogs.com/sports/womens-soccer/roster'
  ,'tcu|Volleyball':'https://gofrogs.com/sports/womens-volleyball/roster'
  ,'tcu|Football':'https://gofrogs.com/sports/football/roster'
  ,'utah|Cross Country':'https://utahutes.com/sports/cross-country/roster'
  ,'utah|Soccer':'https://utahutes.com/sports/womens-soccer/roster'
  ,'utah|Volleyball':'https://utahutes.com/sports/womens-volleyball/roster'
  ,'utah|Football':'https://utahutes.com/sports/football/roster'
  ,'west-virginia|Cross Country':'https://wvusports.com/sports/womens-cross-country/roster'
  ,'west-virginia|Soccer':'https://wvusports.com/sports/womens-soccer/roster'
  ,'west-virginia|Volleyball':'https://wvusports.com/sports/womens-volleyball/roster'
  ,'west-virginia|Football':'https://wvusports.com/sports/football/roster'
}));
function teamLabelForSource(sport,url){
  if(!COMBINED_TEAM_SPORTS.has(sport))return null;
  const path=new URL(url).pathname;
  if(/\/(?:mens(?:-|\/)|men-|m-)/i.test(path))return"Men's";
  if(/\/(?:womens(?:-|\/)|women-|w-)/i.test(path))return"Women's";
  return null;
}
function labelTeamEvents(events,sport,url){
  const team_label=teamLabelForSource(sport,url);if(!team_label)return events;
  return events.map(event=>({...event,team_label,title:`${team_label} · ${event.title}`}));
}

const KNOWN_URLS=new Map(Object.entries({
  'alabama|Cross Country':'https://rolltide.com/sports/xctrack/schedule/text',
  'alabama|Football':'https://rolltide.com/sports/football/schedule',
  'alabama|Soccer':'https://rolltide.com/sports/womens-soccer/schedule',
  'alabama|Track & Field':'https://rolltide.com/sports/xctrack/schedule/text',
  'alabama|Volleyball':'https://rolltide.com/sports/womens-volleyball/schedule',
  'kstate|Volleyball':'https://www.kstatesports.com/sports/womens-volleyball/schedule',
  'kstate|Soccer':'https://www.kstatesports.com/sports/womens-soccer/schedule',
  'kstate|Cross Country':'https://www.kstatesports.com/sports/cross-country/schedule',
  'kstate|Track & Field':'https://www.kstatesports.com/sports/track-and-field/schedule',
  'kstate|Football':'https://www.kstatesports.com/sports/football/schedule',
  'kstate|Rowing':'https://www.kstatesports.com/sports/womens-rowing/schedule',
  'kansas|Volleyball':'https://kuathletics.com/sports/wvball/schedule',
  'kansas|Soccer':'https://kuathletics.com/sports/wsoc/schedule',
  'kansas|Cross Country':'https://kuathletics.com/sports/cross-country/schedule',
  'kansas|Track & Field':'https://kuathletics.com/sports/track-and-field/schedule',
  'kansas|Football':'https://kuathletics.com/sports/football/schedule',
  'kansas|Swimming & Diving':'https://kuathletics.com/sports/swimming-and-diving/schedule',
  'kansas|Rowing':'https://kuathletics.com/sports/womens-rowing/schedule',
  'oklahoma-state|Cross Country':'https://okstate.com/sports/mxct/schedule',
  'oklahoma-state|Soccer':'https://okstate.com/sports/womens-soccer/schedule',
  'oklahoma-state|Track & Field':'https://okstate.com/sports/mxct/schedule',
  'oklahoma-state|Football':'https://okstate.com/sports/football/schedule',
  'oklahoma-state|Tennis':['https://okstate.com/sports/womens-tennis/schedule','https://okstate.com/sports/mens-tennis/schedule'],
  'oklahoma-state|Wrestling':'https://okstate.com/sports/wrestling/schedule',
  'florida|Volleyball':'https://floridagators.com/sports/womens-volleyball/schedule',
  'florida|Soccer':'https://floridagators.com/sports/womens-soccer/schedule',
  'florida|Cross Country':'https://floridagators.com/sports/cross-country/schedule',
  'florida|Track & Field':'https://floridagators.com/sports/track-and-field/schedule',
  'florida|Football':'https://floridagators.com/sports/football/schedule',
  'florida|Swimming & Diving':'https://floridagators.com/sports/swimming-and-diving/schedule',
  'arizona|Volleyball':'https://arizonawildcats.com/sports/womens-volleyball/schedule',
  'arizona|Soccer':'https://arizonawildcats.com/sports/womens-soccer/schedule',
  'arizona|Cross Country':'https://arizonawildcats.com/sports/cross-country/schedule',
  'arizona|Football':'https://arizonawildcats.com/sports/football/schedule',
  'arizona|Swimming & Diving':['https://arizonawildcats.com/sports/mens-swimming-and-diving/schedule','https://arizonawildcats.com/sports/womens-swimming-and-diving/schedule'],
  'arizona-state|Volleyball':'https://thesundevils.com/sports/volleyball/schedule',
  'arizona-state|Soccer':'https://thesundevils.com/sports/soccer/schedule',
  'arizona-state|Cross Country':'https://thesundevils.com/sports/cross-country/schedule',
  'arizona-state|Football':'https://thesundevils.com/sports/football/schedule',
  'arizona-state|Swimming & Diving':['https://thesundevils.com/sports/mens/swimming-diving/schedule','https://thesundevils.com/sports/womens/swimming-diving/schedule'],
  'texas-tech|Volleyball':'https://texastech.com/sports/womens-volleyball/schedule',
  'texas-tech|Soccer':'https://texastech.com/sports/womens-soccer/schedule',
  'texas-tech|Cross Country':'https://texastech.com/sports/cross-country/schedule',
  'texas-tech|Track & Field':'https://texastech.com/sports/track-and-field/schedule',
  'texas-tech|Football':'https://texastech.com/sports/football/schedule',
  'baylor|Cross Country':'https://baylorbears.com/sports/cross-country/schedule',
  'baylor|Soccer':'https://baylorbears.com/sports/womens-soccer/schedule',
  'baylor|Volleyball':'https://baylorbears.com/sports/womens-volleyball/schedule',
  'baylor|Football':'https://baylorbears.com/sports/football/schedule',
  'byu|Cross Country':'https://byucougars.com/sports/womens-cross-country/schedule',
  'byu|Soccer':'https://byucougars.com/sports/womens-soccer/schedule',
  'byu|Volleyball':'https://byucougars.com/sports/womens-volleyball/schedule',
  'byu|Football':'https://byucougars.com/sports/football/schedule',
  'ucf|Cross Country':'https://ucfknights.com/sports/cross-country/schedule',
  'ucf|Soccer':'https://ucfknights.com/sports/womens-soccer/schedule',
  'ucf|Volleyball':'https://ucfknights.com/sports/volleyball/schedule',
  'ucf|Football':'https://ucfknights.com/sports/football/schedule',
  'cincinnati|Cross Country':'https://gobearcats.com/sports/cross-country/schedule',
  'cincinnati|Soccer':'https://gobearcats.com/sports/womens-soccer/schedule',
  'cincinnati|Volleyball':'https://gobearcats.com/sports/womens-volleyball/schedule',
  'cincinnati|Football':'https://gobearcats.com/sports/football/schedule',
  'colorado|Cross Country':'https://cubuffs.com/sports/cross-country/schedule',
  'colorado|Soccer':'https://cubuffs.com/sports/womens-soccer/schedule',
  'colorado|Volleyball':'https://cubuffs.com/sports/womens-volleyball/schedule',
  'colorado|Football':'https://cubuffs.com/sports/football/schedule',
  'houston|Cross Country':'https://uhcougars.com/sports/cross-country/schedule',
  'houston|Soccer':'https://uhcougars.com/sports/womens-soccer/schedule',
  'houston|Volleyball':'https://uhcougars.com/sports/womens-volleyball/schedule',
  'houston|Football':'https://uhcougars.com/sports/football/schedule',
  'iowa-state|Cross Country':'https://cyclones.com/sports/cross-country/schedule',
  'iowa-state|Soccer':'https://cyclones.com/sports/womens-soccer/schedule',
  'iowa-state|Volleyball':'https://cyclones.com/sports/womens-volleyball/schedule',
  'iowa-state|Football':'https://cyclones.com/sports/football/schedule',
  'tcu|Cross Country':'https://gofrogs.com/sports/cross-country/schedule',
  'tcu|Soccer':'https://gofrogs.com/sports/womens-soccer/schedule',
  'tcu|Volleyball':'https://gofrogs.com/sports/womens-volleyball/schedule',
  'tcu|Football':'https://gofrogs.com/sports/football/schedule',
  'utah|Cross Country':'https://utahutes.com/sports/cross-country/schedule',
  'utah|Soccer':'https://utahutes.com/sports/womens-soccer/schedule',
  'utah|Volleyball':'https://utahutes.com/sports/womens-volleyball/schedule',
  'utah|Football':'https://utahutes.com/sports/football/schedule',
  'west-virginia|Cross Country':'https://wvusports.com/sports/womens-cross-country/schedule',
  'west-virginia|Soccer':'https://wvusports.com/sports/womens-soccer/schedule',
  'west-virginia|Volleyball':'https://wvusports.com/sports/womens-volleyball/schedule',
  'west-virginia|Football':'https://wvusports.com/sports/football/schedule',
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
  const known=KNOWN_ROSTER_URLS.get(`${school.id}|${sport}`);if(known)return Array.isArray(known)?known:[known];
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
  const re=/"([^"]+\.(?:jpe?g|png|webp|avif))",(?:"[^"]*",)?"(https?:\/\/[^"]+\.(?:jpe?g|png|webp|avif)(?:\?[^"]*)?)"/gi;
  while((m=re.exec(text))){
    const key=slug(decodeHtml(m[1]).replace(/\.[^.]+$/,''));
    const url=absoluteUrl(m[2],base);
    if(key&&url&&!/(?:logo|placeholder|default|favicon|icon|brand|pitchfork|powercat|sport[_-]?mark)/i.test(decodeURIComponentSafe(url)))images.set(key,url);
  }
  return images;
}
function decodeURIComponentSafe(value){try{return decodeURIComponent(value)}catch{return String(value||'')}}
function officialCardInstagram(value){
  // Some WMT publishers accidentally prepend instagram.com twice. Because
  // this link is inside the named athlete's official roster card, recover the
  // final handle while still rejecting navigation/team destinations.
  const matches=[...decodeHtml(value||'').matchAll(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/@?([A-Za-z0-9._]+)/gi)];
  const handle=matches.at(-1)?.[1]?.replace(/^@/,'').toLowerCase();
  return handle&&!BLOCKED_INSTAGRAM_HANDLES.has(handle)?`https://www.instagram.com/${handle}/`:null;
}
function rosterProfiles(raw,base){
  const byUrl=new Map(),payloadImages=rosterPayloadImages(raw,base),socials=rosterSocialInstagrams(raw);let m;
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
  // WMT/Nuxt keeps each athlete's name, profile, portrait, and Instagram link
  // inside one roster card but does not publish SIDEARM's social aria-label.
  // Bind fields inside the card so navigation/team accounts remain ineligible.
  const wmtCards=String(raw||'').split(/<div\b[^>]*class=["'][^"']*\broster-card(?:-item)?(?=\s|["'])[^"']*["'][^>]*>/i).slice(1);
  for(const body of wmtCards){
    const profileMatch=body.match(/<a\b[^>]*href=["']([^"']*\/sports\/[^"']+\/roster\/player\/[^"'?#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    if(!profileMatch)continue;
    const url=absoluteUrl(profileMatch[1],base),path=url?new URL(url).pathname:'';
    if(!url||/\/(?:staff|coaches)\//i.test(path))continue;
    const imgAlt=decodeHtml((body.match(/<img\b[^>]*alt=["']([^"']*)/i)||[])[1]||'');
    const name=clean(visibleText(profileMatch[2])||imgAlt);if(nameScore(name)<=0)continue;
    const instagram=(body.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?#\s]+)[^"']*["']/i)||[])[1];
    const instagram_url=officialCardInstagram(instagram);
    const imgTitle=decodeHtml((body.match(/<img\b[^>]*title=["']([^"']*)/i)||[])[1]||'');
    const image_url=payloadImages.get(slug(name))||payloadImages.get(slug(imgTitle.replace(/\.[^.]+$/,'')))||athleteImage(body,base,name,true)||null;
    byUrl.set(url,{name,url,image_url,instagram_url});
  }
  // Large WMT rosters, including Cincinnati Football, render compact list
  // items instead of cards. The player name, portrait and social link remain
  // identity-bound inside one official roster row.
  const wmtListItems=String(raw||'').split(/<li\b[^>]*class=["'][^"']*\broster-list-item(?=\s|["'])[^"']*["'][^>]*>/i).slice(1);
  for(const body of wmtListItems){
    const profileMatch=body.match(/<a\b[^>]*href=["']([^"']*\/sports\/[^"']+\/roster\/player\/[^"'?#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    if(!profileMatch)continue;
    const url=absoluteUrl(profileMatch[1],base),path=url?new URL(url).pathname:'';
    if(!url||/(?:staff|coaches)\//i.test(path))continue;
    const imgAlt=decodeHtml((body.match(/<img\b[^>]*alt=["']([^"']*)/i)||[])[1]||'');
    const name=clean(visibleText(profileMatch[2])||imgAlt);if(nameScore(name)<=0)continue;
    const instagram=(body.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?#\s]+)[^"']*["']/i)||[])[1];
    const instagram_url=officialCardInstagram(instagram);
    const imgTitle=decodeHtml((body.match(/<img\b[^>]*title=["']([^"']*)/i)||[])[1]||'');
    const image_url=payloadImages.get(slug(name))||payloadImages.get(slug(imgTitle.replace(/\.[^.]+$/,'')))||athleteImage(body,base,name,true)||null;
    byUrl.set(url,{name,url,image_url,instagram_url});
  }
  // Other WMT sports use table rows instead of cards. Apply the same
  // same-container identity rule to those rows.
  const wmtRows=String(raw||'').split(/<tr\b[^>]*>/i).slice(1);
  for(const row of wmtRows){
    const body=row.split(/<\/tr\s*>/i)[0];
    const profileMatch=body.match(/<a\b[^>]*href=["']([^"']*\/sports\/[^"']+\/roster\/player\/[^"'?#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    if(!profileMatch)continue;
    const url=absoluteUrl(profileMatch[1],base),name=clean(visibleText(profileMatch[2]));
    if(!url||nameScore(name)<=0)continue;
    const instagram=(body.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?#\s]+)[^"']*["']/i)||[])[1];
    const instagram_url=officialCardInstagram(instagram);
    const previous=byUrl.get(url);
    byUrl.set(url,{name,url,image_url:previous?.image_url||null,instagram_url:instagram_url||previous?.instagram_url||null});
  }
  while((m=re.exec(raw))){
    const url=absoluteUrl(m[1],base),imgAlt=decodeHtml((m[2].match(/<img\b[^>]*alt=["']([^"']*)/i)||[])[1]||''),imgTitle=decodeHtml((m[2].match(/<img\b[^>]*title=["']([^"']*)/i)||[])[1]||''),name=clean((visibleText(m[2])||imgAlt).replace(/\s+(?:headshot|photo)$/i,''));if(!url)continue;
    const path=new URL(url).pathname;
    // Only real player profile shapes are eligible. This rejects seasonal
    // roster pages and staff/coach profiles even when their URLs are nested.
    if(/\/(?:staff|coaches)\//i.test(path))continue;
    if(!/\/roster\/(?:player\/[^/]+|[^/]+\/\d+)\/?$/i.test(path))continue;
    const previous=byUrl.get(url);
    const image_url=payloadImages.get(slug(name))||payloadImages.get(slug(imgTitle.replace(/\.[^.]+$/,'')))||athleteImage(m[2],base,name,true)||previous?.image_url||null;
    // SIDEARM often publishes the portrait and the visible athlete name in two
    // separate anchors that share the same profile URL. Keep an image-only
    // anchor long enough to join it to the later name anchor.
    if(!previous&&image_url)byUrl.set(url,{name:'',url,image_url});
    else if(nameScore(name)>nameScore(previous?.name))byUrl.set(url,{name,url,image_url});
    else if(previous&&!previous.image_url&&image_url)byUrl.set(url,{...previous,image_url});
  }
  return[...byUrl.values()].filter(x=>nameScore(x.name)>0).map(profile=>({...profile,instagram_url:profile.instagram_url||socials.get(profile.name.toLowerCase())||null}));
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
function officialProfileImage(raw,profileUrl){
  const match=String(raw||'').match(/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)|<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
  const imageUrl=absoluteUrl(match?.[1]||match?.[2],profileUrl);if(!imageUrl)return null;
  try{
    const imageHost=new URL(imageUrl).hostname.replace(/^www\./,''),profileHost=new URL(profileUrl).hostname.replace(/^www\./,'');
    return imageHost===profileHost&&!/(?:logo|placeholder|default|favicon|icon|brand)/i.test(decodeURIComponentSafe(imageUrl))?imageUrl:null;
  }catch{return null}
}
const BLOCKED_INSTAGRAM_HANDLES=new Set(['kstatesports','sundevilathletics','texastech_fb','texastech','ttumensgolf','texastechwgolf','explore','accounts','p','reel','reels']);
function verifiedInstagram(raw){
  // Some official athlete bios publish personal social links only inside a
  // Schema.org Person record. Accept those identity-bound links before scanning
  // page navigation, which commonly contains the school or team account.
  let schemaMatch;const schemas=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const personInstagram=value=>{
    if(!value||typeof value!=='object')return null;
    if(String(value['@type']||'').toLowerCase()==='person'){
      for(const link of Array.isArray(value.sameAs)?value.sameAs:[value.sameAs]){
        if(typeof link!=='string')continue;
        try{const u=new URL(link),parts=u.pathname.split('/').filter(Boolean),handle=(parts[0]||'').replace(/^@/,'').toLowerCase();if(/(?:^|\.)instagram\.com$/i.test(u.hostname)&&parts.length===1&&handle&&!BLOCKED_INSTAGRAM_HANDLES.has(handle))return `https://www.instagram.com/${handle}/`}catch{}
      }
    }
    for(const child of Array.isArray(value)?value:Object.values(value)){const found=personInstagram(child);if(found)return found}
    return null;
  };
  while((schemaMatch=schemas.exec(raw))){try{const found=personInstagram(JSON.parse(decodeHtml(schemaMatch[1])));if(found)return found}catch{}}
  let m;const re=/<a\b[^>]*href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?#\s]+)[^"']*["'][^>]*>/gi;
  while((m=re.exec(raw))){
    try{
      const u=new URL(decodeHtml(m[1])),parts=u.pathname.split('/').filter(Boolean);
      const handle=(parts[0]||'').replace(/^@/,'').toLowerCase();
      if(parts.length===1&&handle&&!BLOCKED_INSTAGRAM_HANDLES.has(handle))return`https://www.instagram.com/${handle}/`;
    }catch{}
  }
  return null;
}
async function instagramProfileImage(instagramUrl){
  if(!instagramUrl)return null;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
  try{
    const r=await fetch(instagramUrl,{headers:{...HEADERS,'User-Agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36'},redirect:'follow',signal:controller.signal});
    if(!r.ok)return null;
    const html=await r.text();
    const meta=html.match(/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)|<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    const imageUrl=absoluteUrl(meta?.[1]||meta?.[2],r.url||instagramUrl);
    if(!imageUrl||/(?:logo|placeholder|default|favicon|icon|brand)/i.test(decodeURIComponentSafe(imageUrl)))return null;
    return imageUrl;
  }catch{return null}finally{clearTimeout(timer)}
}
async function featuredAthletes(schoolId,sport){
  const school=schools.find(s=>s.id===schoolId);if(!school)return[];
  let profiles=[];
  for(const rosterUrl of rosterUrls(school,sport)){
    try{
      const r=await fetch(rosterUrl,{headers:HEADERS,redirect:'follow'});if(!r.ok)continue;
      const discovered=rosterProfiles(await r.text(),r.url||rosterUrl);
      profiles.push(...discovered.filter(profile=>!profiles.some(existing=>existing.url===profile.url)));
      if(profiles.length&&!COMBINED_TEAM_SPORTS.has(sport))break;
      if(profiles.length>=18)break;
    }catch{}
  }
  // Roster-card portraits are the most reliable source. Put those athletes
  // first, then retain the daily shuffle within each group.
  const overrideFor=profile=>profile.instagram_url||VERIFIED_TEAM_TAG_INSTAGRAM.get(`${schoolId}|${sport}|${profile.name}`)||null;
  profiles.sort((a,b)=>Number(Boolean(overrideFor(b)))-Number(Boolean(overrideFor(a)))||Number(Boolean(b.image_url))-Number(Boolean(a.image_url))||dailyRank(a.url)-dailyRank(b.url));
  // Official roster-card social labels and official-team tags are already
  // identity verified. Return them without refetching many biography pages.
  // This keeps large football rosters within Worker request limits.
  const tagged=profiles.filter(profile=>overrideFor(profile)).map(profile=>({
    name:profile.name,
    instagram_url:overrideFor(profile),
    profile_url:profile.url,
    image_url:profile.image_url||null
  }));
  if(tagged.length>=2){
    // The fast path must enforce the same identity rules as biography-page
    // discovery. Some publishers reuse a generic roster image across cards.
    const imageOwners=new Map(),socialOwners=new Map();
    for(const athlete of tagged){
      if(athlete.image_url){const key=athlete.image_url.replace(/#.*$/,'');if(!imageOwners.has(key))imageOwners.set(key,[]);imageOwners.get(key).push(athlete)}
      if(athlete.instagram_url){const key=athlete.instagram_url.toLowerCase().replace(/[?#].*$/,'');if(!socialOwners.has(key))socialOwners.set(key,[]);socialOwners.get(key).push(athlete)}
    }
    for(const owners of imageOwners.values())if(new Set(owners.map(x=>x.name)).size>1)for(const athlete of owners)athlete.image_url=null;
    for(const owners of socialOwners.values())if(new Set(owners.map(x=>x.name)).size>1)for(const athlete of owners)athlete.instagram_url=null;
    tagged.sort((a,b)=>Number(Boolean(b.image_url))-Number(Boolean(a.image_url))||dailyRank(a.name)-dailyRank(b.name));
    const selected=tagged.filter(athlete=>athlete.instagram_url).slice(0,3);
    await Promise.all(selected.map(async athlete=>{
      if(athlete.image_url)return;
      try{const r=await fetch(athlete.profile_url,{headers:HEADERS,redirect:'follow'});if(r.ok)athlete.image_url=officialProfileImage(await r.text(),r.url||athlete.profile_url)}catch{}
    }));
    return selected;
  }
  const found=[];
  // Inspect deterministic roster batches until three verified athletes are
  // found. This avoids randomly skipping smaller teams while keeping large
  // football rosters within a safe official-site request budget.
  for(let start=0;start<Math.min(profiles.length,18)&&found.filter(a=>a.instagram_url).length<3;start+=3){
    await Promise.all(profiles.slice(start,start+3).map(async profile=>{
      try{
        const r=await fetch(profile.url,{headers:HEADERS,redirect:'follow'});if(!r.ok)return;
        const html=await r.text(),instagram_url=verifiedInstagram(html)||overrideFor(profile);
        found.push({name:profile.name,instagram_url,profile_url:profile.url,image_url:officialProfileImage(html,r.url||profile.url)||athleteImage(html,r.url||profile.url,profile.name)||profile.image_url});
      }catch{}
    }));
  }
  // Final publisher-independent guard. Every portrait source—roster HTML,
  // embedded payload, profile markup, or Schema.org—must pass this check.
  for(const athlete of found)if(athlete.image_url&&/(?:logo|placeholder|default|favicon|icon|brand|pitchfork|powercat|sport[_-]?mark)/i.test(decodeURIComponentSafe(athlete.image_url)))athlete.image_url=null;
  // Global identity guard: one portrait cannot represent different athletes.
  // If a publisher supplies a shared page image, use safe initials instead.
  const imageOwners=new Map();
  for(const athlete of found){if(!athlete.image_url)continue;const key=athlete.image_url.replace(/#.*$/,'');if(!imageOwners.has(key))imageOwners.set(key,[]);imageOwners.get(key).push(athlete)}
  for(const owners of imageOwners.values())if(new Set(owners.map(x=>x.name)).size>1)for(const athlete of owners)athlete.image_url=null;
  // A shared social destination is a school or team account, not an athlete's
  // verified identity. Reject it even when the publisher changes handles.
  const socialOwners=new Map();
  for(const athlete of found){if(!athlete.instagram_url)continue;const key=athlete.instagram_url.toLowerCase().replace(/[?#].*$/,'');if(!socialOwners.has(key))socialOwners.set(key,[]);socialOwners.get(key).push(athlete)}
  for(const owners of socialOwners.values())if(new Set(owners.map(x=>x.name)).size>1)for(const athlete of owners)athlete.instagram_url=null;
  const ranked=found.filter(a=>a.instagram_url).sort((a,b)=>dailyRank(a.name)-dailyRank(b.name));
  const selected=[...ranked.filter(a=>a.image_url),...ranked.filter(a=>!a.image_url)].slice(0,3);
  await Promise.all(selected.map(async athlete=>{if(!athlete.image_url)athlete.image_url=await instagramProfileImage(athlete.instagram_url)}));
  // Some official publishers provide current roster portraits and profile
  // pages without publishing personal social links. Keep the carousel useful
  // in that case by filling the remaining slots with official roster profiles.
  // Personal Instagram links are still shown only when identity verified.
  const used=new Set(selected.map(athlete=>athlete.profile_url));
  const officialProfiles=profiles
    .filter(profile=>!used.has(profile.url)&&profile.image_url)
    .sort((a,b)=>dailyRank(a.name)-dailyRank(b.name))
    .map(profile=>({name:profile.name,instagram_url:null,profile_url:profile.url,image_url:profile.image_url}));
  return [...selected,...officialProfiles].slice(0,3);
}
function candidateUrls(school,sport){const known=KNOWN_URLS.get(`${school.id}|${sport}`);if(known)return Array.isArray(known)?known:[known];const out=[],base=school.athletics_url.replace(/\/$/,'');for(const p of (SPORT_PATHS[sport]||[slug(sport)]))out.push(`${base}/sports/${p}/schedule`);out.push(`${base}/`);return[...new Set(out)];}
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
  'texas-tech|Volleyball|2026-09-05|nevada':{
    source_url:'https://texastech.com/news/2026/9/5/womens-volleyball-tech-bounces-back-against-wolfpack',
    highlights:[
      'Texas Tech defeated Nevada 3-2 after winning the deciding fifth set 15-9.',
      'Kenna McKenzie matched her career high with 23 kills, and Tatum Johnson added a career-high 10.',
      'The Red Raiders finished with 63 kills, nine aces and 10 blocks while holding Nevada to a .171 hitting percentage.'
    ],
    stats:[{label:'Kills',value:'Texas Tech 63 · Nevada 57'},{label:'Hitting percentage',value:'Texas Tech .265 · Nevada .171'},{label:'Aces',value:'Texas Tech 9 · Nevada 3'},{label:'Blocks',value:'Texas Tech 10 · Nevada 8'}]
  },
  'texas-tech|Volleyball|2026-09-04|sacramento-state':{
    source_url:'https://texastech.com/news/2026/9/4/womens-volleyball-red-raiders-fall-to-hornets',
    highlights:[
      'Sacramento State defeated Texas Tech in three closely contested sets, 25-22, 26-24 and 27-25.',
      'Shelby Ignash led Texas Tech with nine kills while hitting .467 and matching her career high.',
      'Katelyn Cochran recorded 34 assists, and Emily Contreras led the Red Raiders with 12 digs.'
    ],
    stats:[{label:'Kills',value:'Texas Tech 39 · Sacramento State 50'},{label:'Hitting percentage',value:'Texas Tech .267 · Sacramento State .299'},{label:'Assists',value:'Texas Tech 37 · Sacramento State 47'},{label:'Blocks',value:'Texas Tech 5 · Sacramento State 4'}]
  },
  'texas-tech|Volleyball|2026-09-03|saint-mary-s':{
    source_url:'https://texastech.com/news/2026/9/3/womens-volleyball-freshmen-continue-to-shine-in-red-raiders-win',
    highlights:[
      'Texas Tech defeated Saint Mary’s 3-1, winning the final two sets 25-18 and 25-20.',
      'Sara Bowcutt posted 21 kills and Elia Dinsmore added 14 as the freshman duo combined for 35.',
      'Katelyn Cochran recorded 42 assists and nine digs, while Shelby Ignash finished with eight blocks.'
    ],
    stats:[{label:'Set scores',value:'25-23 · 20-25 · 25-18 · 25-20'},{label:'Bowcutt kills',value:'21'},{label:'Dinsmore kills',value:'14'},{label:'Cochran assists',value:'42'}]
  },
  'texas-tech|Volleyball|2026-08-29|st-thomas':{
    source_url:'https://texastech.com/news/2026/8/29/womens-volleyball-tech-holds-on-to-beat-st-thomas',
    highlights:[
      'Texas Tech defeated St. Thomas 3-2 after taking the deciding fifth set 17-15.',
      'Five Red Raiders recorded double-digit digs, and Taylor Cook, Sara Bowcutt and Elia Dinsmore posted double-doubles.',
      'Dinsmore finished with 14 kills and 12 digs, while Bowcutt led Texas Tech with 15 kills.'
    ],
    stats:[{label:'Kills',value:'Texas Tech 54 · St. Thomas 54'},{label:'Digs',value:'Texas Tech 77'},{label:'Blocks',value:'Texas Tech 11'},{label:'Cook assists',value:'42'}]
  },
  'texas-tech|Volleyball|2026-08-28|wyoming':{
    source_url:'https://texastech.com/news/2026/8/28/womens-volleyball-red-raiders-drops-season-opener-to-cowgirls',
    highlights:[
      'Wyoming defeated Texas Tech 3-1 in the season opener.',
      'Sara Bowcutt led the Red Raiders with 12 kills and three aces in her collegiate debut.',
      'Texas Tech won the second set 25-14 before Wyoming closed the match with wins in sets three and four.'
    ],
    stats:[{label:'Kills',value:'Texas Tech 34 · Wyoming 50'},{label:'Hitting percentage',value:'Texas Tech .074 · Wyoming .276'},{label:'Aces',value:'Texas Tech 6 · Wyoming 5'},{label:'Blocks',value:'Texas Tech 8 · Wyoming 10'}]
  },
  'texas-tech|Football|2026-09-05|abilene-christian':{
    source_url:'https://texastech.com/news/2026/9/5/football-texas-tech-tops-acu-in-season-opener-33-10',
    highlights:[
      'Will Hammond completed 26 of 33 passes for 298 yards and a touchdown in Texas Tech’s 33-10 win.',
      'Quinten Joyner and J’Koby Williams scored first-quarter rushing touchdowns as Texas Tech built a 14-0 lead.',
      'Texas Tech held Abilene Christian to 194 total yards while Stone Harrington made four field goals.'
    ],
    stats:[
      {label:'Total yards',value:'Texas Tech 471 · ACU 194'},
      {label:'Passing yards',value:'Texas Tech 298 · ACU 119'},
      {label:'Rushing yards',value:'Texas Tech 173 · ACU 75'},
      {label:'First downs',value:'Texas Tech 26 · ACU 15'}
    ]
  },
  'florida|Soccer|2026-08-23|t3-florida-state':{
    source_url:'https://seminoles.com/news/2026/8/23/womens-soccer-florida-state-suffers-seasons-first-loss',
    highlights:[
      'Florida handed No. 3 Florida State its first loss of the season with a 3-1 home victory.',
      'The Gators led at halftime and added two second-half goals while Florida State scored once after the break.',
      'Florida put eight of its 14 shots on target and forced five saves from Seminoles goalkeeper Kate Ockene.',
      'The victory ended Florida State’s nine-game winning streak and 13-game unbeaten run.'
    ],
    stats:[
      {label:'Shots',value:'Florida 14 · Florida State 8'},
      {label:'Shots on goal',value:'Florida 8 · Florida State 5'},
      {label:'Corners',value:'Florida 5 · Florida State 6'},
      {label:'Final',value:'Florida 3 · Florida State 1'}
    ]
  },
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
  event.source={...event.source,name:'Official athletics game recap'};
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
  const teamRows=meetTeamResultRows(label,event.school);
  if(teamRows.length){event.results=teamRows;event.result_count=teamRows.length;}
  return event;
}
function meetTeamResultRows(label,school){
  const text=clean(label)||'',rows=[],seen=new Set();
  const add=(division,result)=>{
    result=clean(result)?.replace(/^[:\-–—|]+|[:\-–—|]+$/g,'').trim();
    if(!result||/^(?:a\.?m\.?|p\.?m\.?)\b/i.test(result)||/^\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)$/i.test(result))return;
    const group=/^(?:m|men|men's)$/i.test(division)?"Men's Team":"Women's Team",key=`${group}|${result}`;
    if(seen.has(key))return;seen.add(key);rows.push({group,participant:`${school} team`,result});
  };
  // Official publishers use several compact formats for meet finishes:
  // M (1st) / W (2nd), M: 1st | W: 2nd, Men 1st (24) | Women 1st (31),
  // and Men: 1st Women: 2nd.
  for(const m of text.matchAll(/\b(M|W)\s*\(([^)]+)\)/gi))add(m[1],m[2]);
  for(const m of text.matchAll(/\b(M|W)\s*:\s*((?:\d+(?:st|nd|rd|th)|champion|runner-up|no team scores?)(?:\s*\([^)]*\))?)/gi))add(m[1],m[2]);
  for(const m of text.matchAll(/\b(M|W)\s*[-–—]\s*((?:\d+(?:st|nd|rd|th)|champion|runner-up|NTS|no team scores?)(?:\s*\([^)]*\))?)/gi))add(m[1],/^NTS$/i.test(m[2])?'No team score':m[2]);
  for(const m of text.matchAll(/\b(Men(?:'s)?|Women(?:'s)?)\s*:?[ \t]+((?:\d+(?:st|nd|rd|th)|champion|runner-up)(?:\s*\([^)]*\))?)/gi))add(m[1],m[2]);
  return rows;
}
function ordinal(value){
  const n=Number(value);if(!Number.isFinite(n))return clean(value);
  const mod100=n%100,suffix=mod100>=11&&mod100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th');
  return `${n}${suffix}`;
}
function officialSchoolNames(school){
  return [school.id,school.name,school.short_name,...(school.aliases||[])].map(matchText).filter(Boolean);
}
function schoolNameMatches(value,school){
  const name=matchText(value),wanted=officialSchoolNames(school);
  return wanted.includes(name)||wanted.some(x=>x.length>=5&&(name.startsWith(`${x} `)||x.startsWith(`${name} `)));
}
function tableRows(table){
  const rows=[];let match;
  const re=/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  while((match=re.exec(table||''))){
    const cells=[...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>visibleText(x[1]));
    if(cells.length)rows.push(cells);
  }
  return rows;
}
function parseTfrrsCrossCountryResults(raw,school){
  const results=[];let match;
  const sections=/<h3\b[^>]*>([\s\S]*?(?:Team|Individual) Results[\s\S]*?)<\/h3>[\s\S]{0,4000}?<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  while((match=sections.exec(raw||''))){
    const heading=visibleText(match[1]),meta=heading.match(/\b(Men|Women)\s+([^()]*?)\s+(Team|Individual) Results\b/i);
    if(!meta)continue;
    const group=`${meta[1][0].toUpperCase()+meta[1].slice(1).toLowerCase()}'s ${clean(meta[2])}`;
    if(meta[3].toLowerCase()==='team'){
      for(const cells of tableRows(match[2])){
        if(cells.length<5||!schoolNameMatches(cells[1],school))continue;
        results.push({group,participant:`${school.name} team`,result:`${ordinal(cells[0])} · ${cells[4]} pts`});
      }
    }else{
      for(const cells of tableRows(match[2])){
        if(cells.length<6||!schoolNameMatches(cells[3],school))continue;
        results.push({group,participant:cells[1],result:`${ordinal(cells[0])} · ${cells[5]}`});
      }
    }
  }
  return results;
}
function crossCountryEventDate(event){
  const date=new Date(event?.start_time||event?.display_time||'');
  return Number.isNaN(date.getTime())?null:`${date.getUTCMonth()+1}/${date.getUTCDate()}`;
}
function pdfDivisionAt(text,index){
  const before=text.slice(Math.max(0,index-2500),index);
  const labels=[...before.matchAll(/\b(MEN(?:'S)?|WOMEN(?:'S)?)\b/gi)];
  if(labels.length)return/^men/i.test(labels.at(-1)[1])?"Men's":"Women's";
  return "Women's";
}
function pdfAthleteBlocks(text){
  const lines=String(text||'').split(/\r?\n/).map(clean).filter(Boolean),blocks=[];
  const classYear=/^(?:redshirt\s+)?(?:freshman|sophomore|junior|senior|graduate(?: student)?|fifth year)$/i;
  for(let i=0;i<lines.length-2;i++){
    if(!/^[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]{1,30}$/.test(lines[i])||!/^[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’ .-]{1,40}$/.test(lines[i+1]))continue;
    const yearOffset=lines.slice(i+2,i+7).findIndex(x=>classYear.test(x));
    if(yearOffset<0)continue;
    blocks.push({line:i,name:`${lines[i]} ${lines[i+1]}`});
  }
  return{lines,blocks};
}
function parseCrossCountryPdfResults(text,event,school){
  const date=crossCountryEventDate(event);if(!date)return[];
  const {lines,blocks}=pdfAthleteBlocks(text),rows=[],seen=new Set();
  const dateRe=new RegExp(`^${date.replace('/','\\/')}\\b`),timeRe=/\b(\d{1,2}:\d{2}(?:\.\d+)?)\b/,placeRe=/\b(\d+)(?:st|nd|rd|th)\b/i;
  const add=(group,participant,result)=>{const key=`${group}|${participant}|${result}`;if(!seen.has(key)){seen.add(key);rows.push({group,participant,result})}};
  // Cumulative-results PDFs commonly start with one meet-summary row. Preserve
  // its published team place before the individual athlete blocks.
  const firstAthlete=blocks[0]?.line??lines.length;
  for(let i=0;i<firstAthlete;i++){
    const line=lines[i];if(!dateRe.test(line))continue;
    const place=line.match(placeRe);if(!place)continue;
    const division=pdfDivisionAt(text,text.indexOf(line));
    add(`${division} Team`,`${school.name} team`,ordinal(place[1]));
  }
  for(let b=0;b<blocks.length;b++){
    const current=blocks[b],end=blocks[b+1]?.line??lines.length;
    const section=lines.slice(current.line,end),division=pdfDivisionAt(text,text.indexOf(lines[current.line]));
    for(const line of section){
      if(!dateRe.test(line)||/---/.test(line))continue;
      const time=line.match(timeRe),place=line.match(placeRe);
      if(time&&place)add(`${division} Individual Results`,current.name,`${ordinal(place[1])} · ${time[1]}`);
    }
  }
  return rows;
}
function pdfSchoolPattern(school){
  const variants=[school.short_name,school.name,...(school.aliases||[]),school.id.replaceAll('-',' ')]
    .map(clean).filter(x=>x&&x.length>=3).sort((a,b)=>b.length-a.length)
    .map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+'));
  return variants.length?new RegExp(`\\b(?:${variants.join('|')})\\b`,'i'):null;
}
function parseCrossCountryFlatPdfResults(text,school){
  const schoolRe=pdfSchoolPattern(school);if(!schoolRe)return[];
  const lines=String(text||'').split(/\r?\n/).map(clean).filter(Boolean),rows=[],seen=new Set();
  let division=null,section=null,timeMode='only';
  const add=(group,participant,result)=>{const key=`${group}|${participant}|${result}`;if(!seen.has(key)){seen.add(key);rows.push({group,participant,result})}};
  for(const line of lines){
    if(/\bWomen(?:'s|s)?\b/i.test(line))division="Women's";
    else if(/\bMen(?:'s|s)?\b/i.test(line))division="Men's";
    if(/\bTeam Scores?\b/i.test(line)){section='team';continue}
    if(/\bIndividual Results?\b|\bResults\s*-\s*(?:Women|Men)\b/i.test(line)){section='individual';continue}
    if(/\bAv(?:erage)?\s+Mile\b|\bAv\s+Km\b/i.test(line))timeMode='first';
    else if(/\+\/-.*\bTime\b/i.test(line))timeMode='last';
    if(!division||!/^\d+\s/.test(line)||!schoolRe.test(line))continue;
    const place=(line.match(/^(\d+)/)||[])[1];if(!place)continue;
    const schoolAt=line.search(schoolRe);if(schoolAt<0)continue;
    if(section==='team'){
      const after=line.slice(schoolAt).replace(schoolRe,'').trim(),points=(after.match(/^(\d+)\b/)||[])[1];
      if(points)add(`${division} Team`,`${school.name} team`,`${ordinal(place)} · ${points} pts`);
      continue;
    }
    const before=line.slice(0,schoolAt).replace(/^\d+\s+/,'').replace(/^\(?\d+\)?\s+/,'').replace(/^--\s+/,'').replace(/^#\d+\s+/,'').trim();
    const athlete=(before.match(/^(.*?)\s+(?:Fr|So|Jr|Sr|Gr|Graduate(?: Student)?|Freshman|Sophomore|Junior|Senior)$/i)||[])[1];
    if(!athlete||athlete.length<3)continue;
    const after=line.slice(schoolAt).replace(schoolRe,'').trim(),times=[...after.matchAll(/\b\d{1,2}:\d{2}(?:\.\d+)?\b/g)].map(x=>x[0]);
    const time=timeMode==='last'?times.at(-1):times[0];if(!time)continue;
    const participant=athlete.includes(',')?athlete.split(',').map(clean).reverse().join(' '):athlete;
    add(`${division} Individual Results`,participant,`${ordinal(place)} · ${time}`);
  }
  return rows;
}
function athleticLiveMeetId(resultUrl){
  try{
    const url=new URL(resultUrl);
    if(!/(?:^|\.)(?:athletic\.net|athletic\.live|anet\.live)$/i.test(url.hostname)&&!/results\.|live\./i.test(url.hostname))return null;
    return (url.pathname.match(/\/meets\/(\d+)/i)||[])[1]||null;
  }catch{return null}
}
function parseAthleticLiveCrossCountryResults(payload,school){
  const rows=[],seen=new Set(),rounds=payload&&typeof payload==='object'?payload.results:null,teamRounds=payload&&typeof payload==='object'?payload.teamResults:null;
  const add=(group,participant,result)=>{const key=`${group}|${participant}|${result}`;if(!seen.has(key)){seen.add(key);rows.push({group,participant,result})}};
  if(!rounds||typeof rounds!=='object')return rows;
  for(const [roundId,splits] of Object.entries(rounds)){
    const athletes=splits?.split_final;if(!athletes||typeof athletes!=='object')continue;
    const matching=Object.values(athletes).filter(athlete=>athlete&&schoolNameMatches(athlete.tn,school));
    if(!matching.length)continue;
    const gender=matching.find(athlete=>/^[MF]$/i.test(athlete.g||''))?.g?.toUpperCase()==='F'?"Women's":"Men's";
    const teams=teamRounds?.[roundId]?.split_final;
    if(teams&&typeof teams==='object'){
      const team=Object.values(teams).find(candidate=>candidate&&schoolNameMatches(candidate.n,school));
      if(team&&team.p!=null&&team.pt!=null)add(`${gender} Team`,`${school.name} team`,`${ordinal(team.p)} · ${team.pt} pts`);
    }
    matching.sort((a,b)=>(Number(a.p)||9999)-(Number(b.p)||9999)||String(a.n||'').localeCompare(String(b.n||'')));
    for(const athlete of matching){
      if(!athlete.n||athlete.p==null||!athlete.m)continue;
      add(`${gender} Individual Results`,clean(athlete.n),`${ordinal(athlete.p)} · ${clean(athlete.m)}`);
    }
  }
  const order={"Men's Team":0,"Men's Individual Results":1,"Women's Team":2,"Women's Individual Results":3};
  return rows.sort((a,b)=>(order[a.group]??9)-(order[b.group]??9));
}
async function fetchAthleticLiveCrossCountryResults(resultUrl,school){
  const meetId=athleticLiveMeetId(resultUrl);if(!meetId)return[];
  const url=`https://trackmeet-io.firebaseio.com/meet_${meetId}/liveBySplit.json`;
  const response=await fetch(url,{headers:{'User-Agent':HEADERS['User-Agent'],'Accept':'application/json'},redirect:'follow'});
  if(!response.ok)return[];
  const length=Number(response.headers.get('content-length')||0);if(length>3*1024*1024)return[];
  return parseAthleticLiveCrossCountryResults(await response.json(),school);
}
async function fetchOfficialPdfText(resultUrl){
  let response=await fetch(resultUrl,{headers:HEADERS,redirect:'follow'});if(!response.ok)return null;
  let type=response.headers.get('content-type')||'',bytes;
  if(/application\/pdf/i.test(type))bytes=new Uint8Array(await response.arrayBuffer());
  else{
    const html=await response.text(),decoded=html.replace(/\\u002F/gi,'/').replace(/\\\//g,'/').replace(/&amp;/g,'&');
    const urls=[...decoded.matchAll(/https?:\/\/[^"'<> ]+\.pdf(?:\?[^"'<> ]*)?/gi)].map(x=>x[0]);
    const asset=urls.find(x=>{try{return new URL(x).hostname!==new URL(resultUrl).hostname}catch{return false}})||urls.at(-1);
    if(!asset)return null;
    response=await fetch(asset,{headers:HEADERS,redirect:'follow'});if(!response.ok||!/application\/pdf/i.test(response.headers.get('content-type')||''))return null;
    bytes=new Uint8Array(await response.arrayBuffer());
  }
  if(!bytes||bytes.byteLength>12*1024*1024)return null;
  const extracted=await extractText(bytes,{mergePages:true});
  return typeof extracted.text==='string'?extracted.text:null;
}
async function attachOfficialMeetResults(event){
  if(event?.event_type!=='MEET'||event.status!=='Final'||!event.result_url)return event;
  // Exact rows parsed from the event's official recap are already tied to this
  // meet. Never replace them with a season/cumulative PDF linked from it.
  if(event.recap_result_count>0&&event.results?.length)return event;
  try{
    const url=new URL(event.result_url);
    const school=schools.find(x=>x.id===event.school_id);let rows=[];
    if(athleticLiveMeetId(url.href)){
      rows=await fetchAthleticLiveCrossCountryResults(url.href,school);
    }else if(/(^|\.)tfrrs\.org$/i.test(url.hostname)){
      const response=await fetch(url,{headers:HEADERS,redirect:'follow'});if(response.ok)rows=parseTfrrsCrossCountryResults(await response.text(),school);
    }else{
      // SIDEARM commonly exposes official documents through a landing URL such
      // as /documents/YYYY/M/D/file.pdf. The response itself can be HTML before
      // redirecting or embedding the PDF asset, so do not require the requested
      // URL to end in .pdf before using the document resolver.
      const text=await fetchOfficialPdfText(url.href);
      if(text){const flat=parseCrossCountryFlatPdfResults(text,school);rows=flat.length>=2?flat:parseCrossCountryPdfResults(text,event,school);}
    }
    if(rows.length){event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;event.meet_results_verified=true;}
  }catch{}
  return event;
}
function discoverOfficialMeetResultUrl(raw,base){
  const candidates=[];let match;
  const html=String(raw||'').replace(/\\u002F/gi,'/').replace(/\\\//g,'/');
  const links=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,500}?)<\/a>/gi;
  while((match=links.exec(html))){
    const label=visibleText(match[2]),url=absoluteUrl(match[1],base);
    if(!url)continue;
    if(/\b(?:results?|final results?|meet results?)\b/i.test(label)||/(?:tfrrs\.org\/results\/xc\/|\/documents\/.*\.pdf(?:$|[?#]))/i.test(url))candidates.push(url);
  }
  return candidates.find(x=>/tfrrs\.org\/results\/xc\//i.test(x))||candidates.find(x=>/\.pdf(?:$|[?#])/i.test(x))||candidates[0]||null;
}
const FALL_SEASON_SPORTS=new Set(['Football','Volleyball',"Women's Volleyball","Men's Volleyball",'Soccer',"Women's Soccer","Men's Soccer",'Cross Country','Field Hockey']);
const ACADEMIC_YEAR_SPORTS=new Set(['Basketball',"Men's Basketball","Women's Basketball",'Swimming & Diving','Wrestling','Tennis','Golf','Track & Field','Baseball','Softball','Rowing','Gymnastics','Hockey']);
function activeFallSeasonYear(now){return now.getUTCMonth()+1>=7?now.getUTCFullYear():now.getUTCFullYear()-1;}
function filterActiveSeason(events,sport,now){
  if(FALL_SEASON_SPORTS.has(sport)){
    const year=activeFallSeasonYear(now);
    return events.filter(e=>!e.start_time||new Date(e.start_time).getUTCFullYear()===year);
  }
  if(ACADEMIC_YEAR_SPORTS.has(sport)){
    const year=now.getUTCFullYear(),startYear=now.getUTCMonth()+1>=7?year:year-1;
    return events.filter(e=>{if(!e.start_time)return true;const date=new Date(e.start_time),eventYear=date.getUTCFullYear(),month=date.getUTCMonth()+1;return(eventYear===startYear&&month>=7)||(eventYear===startYear+1&&month<=6)});
  }
  return events;
}
function eventType(sport){if(['Cross Country','Track & Field','Golf','Gymnastics','Fencing','Bowling','Rifle','Skiing','Triathlon'].includes(sport))return'MEET';if(['Wrestling','Tennis','Swimming & Diving','Rowing','Equestrian','Beach Volleyball','Acrobatics & Tumbling','STUNT'].includes(sport))return'DUAL';return'GAME';}
function makeEvent({school,sport,status,relation,opponent,date,time,schoolScore,oppScore,resultText,sourceUrl,now}){
  const start=parseDate(date,time);
  let resultLabel=clean(resultText),hasScore=schoolScore!=null&&oppScore!=null;
  let hasOutcome=/^(?:W|L|T|D)(?:\b|\s*,)|^(?:Win|Loss|Tie|Draw)\b/i.test(resultLabel||'');
  let effective=hasScore||hasOutcome?'Final':status;
  // Publisher cards occasionally leak the preceding game's score into a
  // future matchup. The official event date is authoritative: a game after
  // today cannot be a final and must not retain an inherited score/outcome.
  const today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
  const eventDay=start?Date.parse(start.slice(0,10)+'T00:00:00Z'):NaN;
  if(eventType(sport)==='GAME'&&Number.isFinite(eventDay)&&eventDay>today){
    effective='Upcoming';schoolScore=null;oppScore=null;resultLabel=null;hasScore=false;hasOutcome=false;
  }
  if(eventType(sport)==='GAME'&&effective==='Final'&&!hasScore&&!hasOutcome)effective='Upcoming';
  if(effective==='Upcoming'&&start){const a=new Date(start),b=now;if(a.getUTCFullYear()===b.getUTCFullYear()&&a.getUTCMonth()===b.getUTCMonth()&&a.getUTCDate()===b.getUTCDate())effective='Today';}
  const event={id:'live-'+slug(`${school.id}|${sport}|${date||''}|${opponent}|${effective}`).slice(0,180),school_id:school.id,school:school.name,sport,event_type:eventType(sport),status:effective,title:`${school.short_name} ${String(relation).toLowerCase()==='at'?'at':'vs'} ${opponent}`,start_time:start,display_time:formatSourceDate(date,time),opponent,school_score:schoolScore||null,opponent_score:oppScore||null,headline:resultLabel||(schoolScore&&oppScore?`${schoolScore}–${oppScore}`:null),team_summaries:[],results:resultLabel?[{label:'Result',value:resultLabel}]:[],result_count:resultLabel?1:0,source:{name:'Official athletics live schedule',url:sourceUrl,updated_at:now.toISOString()},has_more_results:false,enrichment_warning:null,priority_bucket:{Live:'live',Today:'today',Upcoming:'upcoming',Final:'recent_final'}[effective]||'other',recency_label:{Live:'Live now',Today:'Today',Upcoming:'Upcoming',Final:'Final'}[effective]||effective,last_verified_at:now.toISOString(),freshness_seconds:0,verification_state:'live_source',source_count:1,conflicting_sources:false};
  return enrichGameEvent(enrichMeetEvent(event,date));
}
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
function scheduleYearForDate(raw,dateText,now){
  const text=visibleText(raw),range=text.match(/\b(20\d{2})\s*[-–]\s*(\d{2,4})\b[^.]{0,80}\bSchedule\b/i);
  if(range){
    const start=Number(range[1]),end=Number(range[2].length===2?String(start).slice(0,2)+range[2]:range[2]);
    const monthName=String(dateText||'').trim().slice(0,3).toLowerCase(),month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(monthName)+1;
    if(month)return month>=7?start:end;
  }
  return Number((text.match(/\b(20\d{2})\s+[^.]{0,40}\bSchedule\b/i)||[])[1])||now.getUTCFullYear();
}
function parseSidearmGameCards(raw,school,sport,sourceUrl,now){
  const starts=[...raw.matchAll(/<div\b[^>]*data-test-id=["']s-game-card-standard__root["'][^>]*>/gi)].map(x=>x.index),events=[];
  for(let i=0;i<starts.length;i++){
    const block=raw.slice(starts[i],starts[i+1]||Math.min(raw.length,starts[i]+60000));
    const opponentLink=visibleText((block.match(/<a\b[^>]*data-test-id=["']s-game-card-standard__header-team-opponent-link["'][^>]*>([\s\S]*?)<\/a>/i)||[])[1]);
    const meetName=visibleText((block.match(/data-test-id=["']s-game-card-standard__header-team-event-info["'][^>]*>[\s\S]{0,1200}?<p\b[^>]*>([\s\S]*?)<\/p>/i)||[])[1]);
    const opponent=opponentLink||meetName;
    const dateText=visibleText((block.match(/data-test-id=["']s-game-card-standard__header-game-date(?:-details)?["'][^>]*>([\s\S]*?)<\/span>|data-test-id=["']s-game-card-standard__header-game-date["'][^>]*>([\s\S]*?)<\/p>/i)||[]).slice(1).find(Boolean));
    if(!opponent||!dateText)continue;
    const relation=(visibleText((block.match(/<span\b[^>]*class=["'][^"']*s-stamp__text[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)||[])[1])||(eventType(sport)==='MEET'?'at':'vs')).toLowerCase()==='at'?'at':'vs';
    const result=visibleText((block.match(/data-test-id=["']s-game-card-standard__header-game-team-score["'][^>]*>([\s\S]*?)<\/span>/i)||block.match(/data-test-id=["']s-game-card-standard__header-game-pre-score["'][^>]*>([\s\S]*?)<\/span>/i)||[])[1])
      ||visibleText((block.match(/data-test-id=["']s-game-card-standard__header-game-post-score["'][^>]*>([\s\S]*?)<\/span>/i)||[])[1])
      ||(eventType(sport)==='MEET'?(visibleText(block).match(/\b(?:\d+(?:st|nd|rd|th)\s*-\s*\d+\s*pts?\.?|M:\s*[^|]{1,35}(?:\|\s*W:\s*[^|]{1,35})?|No Team Scores)\b/i)||[])[0]:null);
    // New SIDEARM cards render outcomes as "W Win 70-7", "L Loss 1-3",
    // "T Tie 1-1", or "D Draw 0-0". Accept both the short marker and the
    // expanded word so completed games are never mistaken for upcoming ones.
    const score=result?.match(/\b([WLTD])\b(?:\s*,?\s*(?:Win|Loss|Tie|Draw))?\s*,?\s*(\d+)\s*[-–]\s*(\d+)/i);
    const year=scheduleYearForDate(raw,dateText,now);
    const date=`${dateText.replace(/\([^)]*\)/g,'').trim()}, ${year}`;
    const scheduledDay=new Date(`${date} 23:59:59`);
    const completedMeet=eventType(sport)==='MEET'&&!Number.isNaN(scheduledDay.getTime())&&scheduledDay<now;
    const status=score||(eventType(sport)==='MEET'&&result)||completedMeet?'Final':'Upcoming';
    const event=makeEvent({school,sport,status,relation,opponent,date,time:null,schoolScore:score?.[2]||null,oppScore:score?.[3]||null,resultText:result||(completedMeet?'Completed':null),sourceUrl,now});
    const recapLink=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*(?:aria-label=["'][^"']*Recap[^"']*["'])[^>]*>/i)||block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]{0,500}?\bRecap\b[\s\S]{0,500}?<\/a>/i);
    if(recapLink)event.recap_url=absoluteUrl(recapLink[1],sourceUrl);
    const resultLink=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*(?:aria-label|title)=["'][^"']*Results?[^"']*["'][^>]*>/i)
      ||block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]{0,300}?\bResults?\b[\s\S]{0,300}?<\/a>/i)
      ||block.match(/<a\b[^>]*href=["']([^"']*(?:tfrrs\.org\/results\/xc\/|\/documents\/[^"']+\.pdf(?:\?[^"']*)?))[^"']*["'][^>]*>/i);
    if(resultLink)event.result_url=absoluteUrl(resultLink[1],sourceUrl);
    events.push(event);
  }
  return events;
}
function parseSidearmGameCenterCards(raw,school,sport,sourceUrl,now){
  // Legacy/standard SIDEARM pages already have a cheaper exact parser. Do not
  // run this large-card scan over those documents as well.
  if(/data-test-id=["']s-game-card-standard__root["']/i.test(raw))return[];
  const starts=[...raw.matchAll(/<div\b[^>]*class=["'][^"']*\bs-game-card\s+s-game-card__game-center\b[^"']*["'][^>]*>/gi)].map(x=>x.index),events=[];
  for(let i=0;i<starts.length;i++){
    const block=raw.slice(starts[i],starts[i+1]||Math.min(raw.length,starts[i]+60000));
    const rawOpponent=visibleText((block.match(/<p\b[^>]*class=["'][^"']*s-game-card__opponent-name[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)||[])[1]);
    const relation=/^at\b/i.test(rawOpponent)?'at':'vs',opponent=clean(rawOpponent?.replace(/^(?:at|vs\.?|versus)\s+/i,''));
    const dateBox=(block.match(/<div\b[^>]*class=["'][^"']*s-game-card__date--desktop[^"']*["'][^>]*>([\s\S]{0,600}?)<\/div>/i)||[])[1];
    const dateParts=[...(dateBox||'').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>visibleText(x[1])).filter(Boolean);
    if(!opponent||dateParts.length<2)continue;
    const scoreBox=(block.match(/<div\b[^>]*class=["'][^"']*s-game-card__status-time-and-score__game-score[^"']*["'][^>]*>([\s\S]{0,12000}?)<\/div>\s*<\/div>/i)||[])[1]||'';
    const scores=[...scoreBox.matchAll(/<span\b[^>]*class=["'][^"']*s-text-title(?:\s|["'])[^"']*["'][^>]*>\s*(\d+)\s*<\/span>/gi)].map(x=>x[1]);
    // Game-center cards display the opponent score before the selected school's score.
    const opponentScore=scores[0]||null,schoolScore=scores[1]||null,status=schoolScore!=null&&opponentScore!=null?'Final':'Upcoming';
    const year=scheduleYearForDate(raw,`${dateParts[0]} ${dateParts[1]}`,now),date=`${dateParts[0]} ${dateParts[1]}, ${year}`;
    const event=makeEvent({school,sport,status,relation,opponent,date,time:null,schoolScore,oppScore:opponentScore,resultText:status==='Final'?`${schoolScore}-${opponentScore}`:null,sourceUrl,now});
    const recapLink=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*(?:aria-label=["'][^"']*Recap[^"']*["'])[^>]*>/i)||block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]{0,500}?\bRecap\b[\s\S]{0,500}?<\/a>/i);
    if(recapLink)event.recap_url=absoluteUrl(recapLink[1],sourceUrl);
    events.push(event);
  }
  return events;
}
function parseWmtScheduleCards(raw,school,sport,sourceUrl,now){
  const starts=[...raw.matchAll(/<div\b[^>]*class=["'][^"']*\bschedule-event-item(?=\s|["'])[^"']*["'][^>]*>/gi)].map(x=>x.index),events=[];
  for(let i=0;i<starts.length;i++){
    const block=raw.slice(starts[i],starts[i+1]||Math.min(raw.length,starts[i]+60000));
    const opening=(block.match(/^<div\b[^>]*>/i)||[])[0]||'';
    // WMT has two live layouts: the legacy grid card and the newer Nuxt card.
    // Treat a published result as completion even when the new card omits the
    // old schedule-event-item--completed modifier.
    const rawResult=visibleText((
      block.match(/schedule-event-grid-result__label[^>]*>([\s\S]{0,900}?)<\/strong>/i)
      ||block.match(/schedule-event-item-result__label[^>]*>([\s\S]{0,900}?)<\/div>/i)
      ||[]
    )[1]);
    let completed=/schedule-event-item--completed/i.test(opening)||/^(?:[WLTD]\b|Win\b|Loss\b|Tie\b|Draw\b|Final\b|Completed\b|No Team Scores\b|\d+(?:st|nd|rd|th)\b)/i.test(rawResult||'');
    const dateBox=(
      block.match(/schedule-event-grid-date-mobile__box[^>]*>([\s\S]{0,700}?)<\/strong>/i)
      ||block.match(/schedule-event-date__box[^>]*>([\s\S]{0,1200}?)<\/strong>/i)
      ||[]
    )[1];
    let dateParts=[...(dateBox||'').matchAll(/<time\b[^>]*>([\s\S]*?)<\/time>/gi)].map(x=>visibleText(x[1])).filter(Boolean);
    // New WMT cards can put the weekday in the first <time> and the actual
    // month/day in the second. Treat those as one date instead of interpreting
    // "Sep 4" as the event time.
    if(dateParts.length>=2&&/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?[,]?$/i.test(dateParts[0]))dateParts=[`${dateParts[0]} ${dateParts[1]}`,dateParts[2]].filter(Boolean);
    // Current WMT cards split dates into month and day spans instead of the
    // older date-box strong element. Without this fallback, only future
    // Schema.org events survive and every completed result disappears.
    if(!dateParts.length){
      const splitMonth=visibleText((block.match(/schedule-event-date__month[^>]*>([\s\S]{0,100}?)<\/span>/i)||[])[1]);
      const splitDay=visibleText((block.match(/schedule-event-date__day[^>]*>([\s\S]{0,40}?)<\/span>/i)||[])[1]);
      if(splitMonth&&splitDay)dateParts=[`${splitMonth} ${splitDay}`];
    }
    if(!dateParts.length){
      const splitTimes=[...block.matchAll(/<time\b[^>]*>([\s\S]{0,100}?)<\/time>/gi)].slice(0,2).map(x=>visibleText(x[1])).filter(Boolean);
      if(splitTimes.length>=2)dateParts=[`${splitTimes[0]} ${splitTimes[1]}`];
    }
    const legacyName=block.match(/schedule-default-event__name[^>]*>\s*<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]{0,500}?)<\/strong>/i);
    const defaultNames=[...block.matchAll(/<strong\b[^>]*class=["'][^"']*schedule-default-event__name(?=\s|["'])[^"']*["'][^>]*>([\s\S]{0,1000}?)<\/strong>/gi)].map(x=>visibleText(x[1])).filter(Boolean);
    const modernOpponent=visibleText((block.match(/schedule-event-item__opponent-name[^>]*>([\s\S]{0,500}?)<\/strong>/i)||[])[1]);
    const modernRelation=visibleText((block.match(/(?:schedule-event-item|schedule-default-event)__divider[^>]*>([\s\S]{0,100}?)<\/strong>/i)||[])[1]);
    const relation=(modernRelation||visibleText(legacyName?.[1])).toLowerCase().startsWith('at')?'at':'vs';
    const nestedOpponent=clean(visibleText(legacyName?.[2])?.replace(/^(?:at|vs\.?|versus)\s+/i,''));
    const defaultOpponent=defaultNames.map(name=>clean(name?.replace(/^(?:at|vs\.?|versus)\s+/i,''))).find(name=>name&&matchText(name)!==matchText(school.name)&&!/^(?:at|vs|versus)$/i.test(name));
    const opponent=modernOpponent||nestedOpponent||defaultOpponent;
    if(dateParts.length<1||!opponent)continue;
    // WMT publishers such as Cincinnati prefix card dates with a weekday
    // ("Sat Nov 28"). Normalize that display-only prefix so the canonical
    // date parser can enforce future/final status correctly.
    const dateText=dateParts[0].replace(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?\s+/i,''),time=dateParts[1]||null,year=scheduleYearForDate(raw,dateText,now);
    // Meet publishers often leave only "All Day" on completed cards. The
    // official scheduled date is still safe completion evidence once that
    // calendar day has ended; future time labels remain Upcoming.
    const scheduledDay=new Date(`${dateText}, ${year} 23:59:59`);
    if(eventType(sport)==='MEET'&&!Number.isNaN(scheduledDay.getTime())&&scheduledDay<now)completed=true;
    const scoreText=rawResult||visibleText(block);
    const score=scoreText.match(/\b([WLTD])\b\s*(?:Win|Loss|Tie|Draw)?\s*,?\s*(\d+)\s*[-–]\s*(\d+)/i)
      ||visibleText(block).match(/\b([WLTD])\b\s*(?:Win|Loss|Tie|Draw)?\s*,?\s*(\d+)\s*[-–]\s*(\d+)/i);
    const meaningfulResult=/^(?:[WLTD]\b|Win\b|Loss\b|Tie\b|Draw\b|Final\b|Completed\b|No Team Scores\b|\d+(?:st|nd|rd|th)\b)/i.test(rawResult||'');
    const result=score?`${score[1].toUpperCase()}, ${score[2]}-${score[3]}`:(completed?(meaningfulResult?rawResult:'Completed'):null);
    const date=`${dateText}, ${year}`;
    const event=makeEvent({school,sport,status:completed?'Final':'Upcoming',relation,opponent,date,time,schoolScore:score?.[2]||null,oppScore:score?.[3]||null,resultText:result,sourceUrl,now});
    const recapLink=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*?\bRecap\b(?:(?!<\/a>)[\s\S])*?)<\/a>/i);
    const cardRecap=recapLink?absoluteUrl(recapLink[1],sourceUrl):null;
    if(cardRecap)event.recap_url=cardRecap;
    const resultLink=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*(?:aria-label|title)=["'][^"']*(?:Final\s+)?Results?[^"']*["'][^>]*>/i)
      ||block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]{0,300}?\b(?:Final\s+)?Results?\b[\s\S]{0,300}?<\/a>/i);
    if(resultLink)event.result_url=absoluteUrl(resultLink[1],sourceUrl);
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
function parseTextScheduleRows(raw,school,sport,sourceUrl,now){
  const events=[];let row;
  const rows=/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  while((row=rows.exec(raw))){
    const cells=[];let cell;
    const cellRe=/<td\b[^>]*>([\s\S]*?)<\/td>/gi;
    while((cell=cellRe.exec(row[1])))cells.push(visibleText(cell[1]));
    if(cells.length<7)continue;
    const [dateText,time,site,opponent,,,publishedResult]=cells;
    const category=cells[5];
    if(category&&!sportMatches(category,sport))continue;
    const year=scheduleYearForDate(raw,dateText,now),date=`${dateText.replace(/\s*\([^)]*\)\s*$/,'')}, ${year}`;
    const parsedDay=Date.parse(`${date} ${time||''}`),today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
    const meaningfulResult=clean(publishedResult?.replace(/^(?:N|H|A)\s*-?\s*/i,''));
    const completed=Number.isFinite(parsedDay)&&parsedDay<today;
    const resultText=meaningfulResult&&!/^-?$/.test(meaningfulResult)?meaningfulResult:(completed?'Completed':null);
    events.push(makeEvent({school,sport,status:completed?'Final':'Upcoming',relation:/away/i.test(site)?'at':'vs',opponent,date,time,schoolScore:null,oppScore:null,resultText,sourceUrl,now}));
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
    {name:'sidearm-game-center',parse:parseSidearmGameCenterCards},
    {name:'wmt',parse:parseWmtScheduleCards},
    {name:'text-schedule',parse:parseTextScheduleRows},
    {name:'schema',parse:parseSchemaEvents}
  ];
  for(const adapter of sourceAdapters)eventLists.push(adapter.parse(raw,school,sport,sourceUrl,now));
  const events=mergeEvents(eventLists),rank={Live:0,Today:1,Upcoming:2,Final:3,Unknown:4};
  return events.sort((a,b)=>{const r=(rank[a.status]??4)-(rank[b.status]??4);if(r)return r;const ta=a.start_time?Date.parse(a.start_time):0,tb=b.start_time?Date.parse(b.start_time):0;return a.status==='Final'?tb-ta:ta-tb;});
}
function compactScheduleHtml(raw,sourceUrl){
  let host='';try{host=new URL(sourceUrl).hostname.replace(/^www\./,'')}catch{return raw}
  const path=(()=>{try{return new URL(sourceUrl).pathname}catch{return''}})();
  if(host!=='uhcougars.com'&&!(host==='cubuffs.com'&&/\/football\//i.test(path)))return raw;
  const markers=['data-test-id="s-game-card-standard__root"',"data-test-id='s-game-card-standard__root'",'schedule-event-item'];
  const starts=markers.map(marker=>raw.indexOf(marker)).filter(index=>index>=0);
  if(!starts.length)return raw;
  const start=Math.min(...starts),table=raw.indexOf('schedule__view-box--table',start),footer=raw.indexOf('<footer',start);
  let end=[table,footer].filter(index=>index>start).sort((a,b)=>a-b)[0]||Math.min(raw.length,start+1500000);
  end=Math.min(raw.length,end+4000);
  return raw.slice(0,50000)+raw.slice(Math.max(0,start-1000),end);
}
function eventMergeKey(e){const day=e.start_time?e.start_time.slice(0,10):'';return`${e.school_id}|${e.sport}|${e.team_label||''}|${slug(e.opponent||'')}|${day}`;}
function mergeEvents(eventLists){const statusWeight={Unknown:0,Upcoming:1,Today:2,Live:3,Final:4},byKey=new Map();for(const events of eventLists)for(const e of events){const key=eventMergeKey(e),prev=byKey.get(key);if(!prev){byKey.set(key,e);continue;}const ew=statusWeight[e.status]??0,pw=statusWeight[prev.status]??0,ed=(e.recap_result_count?100:0)+(e.school_score&&e.opponent_score?2:0)+(e.result_count||0)+(e.highlights?.length||0)*2+(e.recap_url?2:0),pd=(prev.recap_result_count?100:0)+(prev.school_score&&prev.opponent_score?2:0)+(prev.result_count||0)+(prev.highlights?.length||0)*2+(prev.recap_url?2:0);if(ew>pw||(ew===pw&&ed>pd))byKey.set(key,e);}return[...byKey.values()];}
function inSeason(sport,month){const windows=SEASONS[sport];if(!windows)return true;return windows.some(([a,b])=>a<=b?month>=a&&month<=b:month>=a||month<=b);}
function groupEvents(events,now=new Date()){if(!events.length)return[];const sport=events[0].sport;events=filterActiveSeason(events,sport,now);if(!events.length)return[];const school=events[0],live=[],results=[],upcoming=[],other=[],today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());for(const e of events){if(e.status==='Live')live.push(e);else if(e.status==='Final')results.push(e);else if(e.status==='Upcoming'||e.status==='Today'){const eventDay=e.start_time?Date.parse(e.start_time.slice(0,10)+'T00:00:00Z'):NaN;if(!Number.isFinite(eventDay)||eventDay>=today)upcoming.push(e);}else other.push(e);}results.sort((a,b)=>(Date.parse(b.start_time)||0)-(Date.parse(a.start_time)||0));upcoming.sort((a,b)=>(Date.parse(a.start_time)||Infinity)-(Date.parse(b.start_time)||Infinity));const active=inSeason(sport,now.getUTCMonth()+1),latest=results.map(e=>e.start_time).filter(Boolean).sort().at(-1)||null,next=upcoming.map(e=>e.start_time).filter(Boolean).sort()[0]||null;return[{school_id:school.school_id,school:school.school,sport,in_season:active,season_label:active?'In season':'Out of season',live,results,upcoming,other,latest_activity_at:latest,next_activity_at:next}];}
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
  const articleWords=text.split(' '),opponentTokens=opponent.split(' ').filter(word=>word.length>=4&&!['team','senior','national'].includes(word));
  const fuzzyOpponent=opponentTokens.length&&opponentTokens.every(token=>articleWords.some(word=>word.startsWith(token.slice(0,7))));
  if(!opponent||(!text.includes(opponent)&&!fuzzyOpponent))return false;
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
  const storyBody=(raw.match(/<div\b[^>]*id=["']storyPageContentBody["'][^>]*>([\s\S]*?)(?=<\/div>\s*<\/(?:div|section)>)/i)||[])[1];
  if(storyBody)return visibleText(storyBody).slice(0,14000);
  const article=(raw.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)||[])[1];
  if(article){const text=visibleText(article),hit=text.search(/HOW IT HAPPENED/i);return text.slice(hit>=0?hit:0,hit>=0?hit+12000:14000);}
  // WMT stores article paragraphs in its embedded application payload instead
  // of articleBody or server-rendered <article> markup. Keep this last because
  // a page payload can include several unrelated stories and meet results.
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
  return'';
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
function recapAthleteResult(article,participant){
  const lower=article.toLowerCase(),name=participant.toLowerCase();let at=lower.indexOf(name);
  const words={first:'1st',second:'2nd',third:'3rd',fourth:'4th',fifth:'5th',sixth:'6th',seventh:'7th',eighth:'8th',ninth:'9th',tenth:'10th'};
  while(at>=0){
    const statement=article.slice(at,at+name.length+190).split(/[.!?]\s/)[0];
    const time=statement.match(/\b\d{1,2}:\d{2}(?:\.\d+)?\b/);
    const numeric=statement.match(/\b\d+(?:st|nd|rd|th)(?:-place)?\b/i);
    const written=statement.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/i);
    const place=numeric?.[0]?.replace(/-place$/i,'')||words[written?.[1]?.toLowerCase()];
    if(place&&time)return`${place} · ${time[0]}`;
    at=lower.indexOf(name,at+name.length);
  }
  return null;
}
function parseCrossCountryRecapRows(raw,event){
  const article=recapArticleText(raw);if(article.length<80)return[];
  const femaleProfiles=(String(raw).match(/"gender":"female"/gi)||[]).length,maleProfiles=(String(raw).match(/"gender":"male"/gi)||[]).length;
  const lead=article.slice(0,1200),division=femaleProfiles>maleProfiles||(/\bwomen(?:'s)?\b/i.test(lead)&&!/\bmen(?:'s)?\b/i.test(lead))?"Women's":"Men's";
  const rows=[],seen=new Set(),add=(participant,result,group=`${division} Individual Results`)=>{const key=matchText(participant);if(key&&!seen.has(key)){seen.add(key);rows.push({group,participant,result})}};
  const teamWin=/\b(?:team title|team victory|won the team|team championship)\b/i.test(article);
  const teamPoints=(article.match(/\b(?:team|knights|wildcats|cougars|utes|cowboys|raiders|bearcats|bears|mountaineers)[^.]{0,90}?\b(\d+)\s+points\b/i)||[])[1];
  if(teamWin)add(`${event.school} team`,teamPoints?`1st · ${teamPoints} pts`:'1st',`${division} Team`);
  const ordinals={first:'1st',second:'2nd',third:'3rd',fourth:'4th',fifth:'5th',sixth:'6th',seventh:'7th',eighth:'8th',ninth:'9th',tenth:'10th'};
  const excluded=new Set(['Florida Intercollegiate','Southern Showcase','Arturo Barrios','Big Twelve','NCAA South','Cross Country','Head Coach','Distance Coach']);
  const linkedNames=[...String(raw).matchAll(/\/roster\/player\/[^"']+["'][^>]*\btitle=["']([^"']+)["']/gi)].map(x=>clean(decodeHtml(x[1]))).filter(Boolean);
  const metadataAthletes=[...String(raw).matchAll(/"givenName":"([^"]+)","familyName":"([^"]+)"[^}]{0,180}?"gender":"(female|male)"/gi)].map(x=>({name:clean(`${decodeHtml(x[1])} ${decodeHtml(x[2])}`),gender:x[3].toLowerCase()})).filter(x=>x.name);
  const metadataNames=metadataAthletes.map(x=>x.name),genderMap=new Map(metadataAthletes.map(x=>[matchText(x.name),x.gender]));
  const officialNames=[...new Set([...linkedNames,...metadataNames])];
  const surnameMap=new Map(officialNames.map(name=>[name.split(/\s+/).at(-1).toLowerCase(),name]));
  const wholeWordLastIndex=(text,term)=>[...text.matchAll(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'g'))].at(-1)?.index??-1;
  for(const timeMatch of article.matchAll(/\b\d{1,2}:\d{2}(?:\.\d+)?\b/g)){
    const before=article.slice(Math.max(0,timeMatch.index-190),timeMatch.index);
    const placeMatches=[...before.matchAll(/\b(\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)(?:-place)?\b/gi)];
    const placeMatch=placeMatches.at(-1);if(!placeMatch)continue;
    const nameArea=before.slice(0,placeMatch.index),names=[...nameArea.matchAll(/\b([A-Z][A-Za-z'’.-]+\s+[A-Z][A-Za-z'’.-]+)\b/g)].map(x=>x[1]);
    const lowerNameArea=nameArea.toLowerCase();
    const identityMatches=[
      ...officialNames.map(name=>({name,index:lowerNameArea.lastIndexOf(name.toLowerCase())})),
      ...surnameMap.entries().map(([last,name])=>({name,index:wholeWordLastIndex(lowerNameArea,last)}))
    ].filter(x=>x.index>=0).sort((a,b)=>b.index-a.index);
    const participant=identityMatches[0]?.name||names.reverse().find(name=>!excluded.has(name)&&!/^Personal Best|Season Best|All Time|Best Finish|Freshm(?:an|en)\b|PL NAME|Cowboy Preview/i.test(name));
    if(!participant)continue;
    const rawPlace=placeMatch[1].toLowerCase(),place=ordinals[rawPlace]||placeMatch[1].replace(/-place$/i,'');
    const athleteDivision=genderMap.get(matchText(participant))==='female'?"Women's":genderMap.get(matchText(participant))==='male'?"Men's":division;
    add(participant,`${place} · ${timeMatch[0]}`,`${athleteDivision} Individual Results`);
  }
  return rows;
}
async function generateAIHighlights(env,e,raw){
  if(e.highlights_verified)return{items:e.highlights,state:'verified'};
  if(!env?.AI)return{items:null,state:'binding_unavailable'};
  const article=recapArticleText(raw);
  if(article.length<80)return{items:null,state:'recap_text_unavailable'};
  const detailedCrossCountry=e.sport==='Cross Country'&&e.event_type==='MEET';
  const prompt=detailedCrossCountry?`Extract the complete ${e.school} cross-country results explicitly stated in this official recap.
Return strict JSON only with this shape:
{"highlights":["four factual complete sentences"],"results":[{"group":"Women's Team or Men's Team or Women's 5K or Men's 8K","participant":"athlete full name or ${e.school} team","result":"place · time and/or team points"}]}
Include separate team rows and every ${e.school} runner whose place or time is stated. Never infer a missing place, time, distance, sex, athlete, or score. Do not include another school's athletes.
Event: ${e.school} at ${e.opponent}; date ${e.start_time?.slice(0,10)||''}
Official recap:
${article.slice(0,10000)}`:`Write exactly four engaging, factual highlights explaining how this ${e.sport} event unfolded.
Use only the official recap. Paraphrase; never copy. Each highlight must be one complete sentence of 16-36 words.
Prioritize ${highlightPriorities(e.sport)}. Include names, timing, score context and why the moment mattered when available.
Reject vague lines like "X scored," "Y won it," or "Team A outshot Team B."
Return four lines only, with each line beginning "- ".

Event: ${e.school} vs ${e.opponent}; date ${e.start_time?.slice(0,10)||''}; final ${e.school_score??''}-${e.opponent_score??''}
Official recap:
${article.slice(0,10000)}`;
  try{
    const request=env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',{
      messages:[{role:'user',content:prompt}],max_tokens:detailedCrossCountry?1800:500,temperature:0.05
    });
    const out=await Promise.race([
      request,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Highlight generation timed out')),8000))
    ]);
    const response=String(out?.response??out?.result?.response??'').trim();
    let list=[],meetResults=[];
    if(detailedCrossCountry){
      const start=response.indexOf('{'),end=response.lastIndexOf('}');
      if(start>=0&&end>start)try{
        const parsed=JSON.parse(response.slice(start,end+1));
        list=Array.isArray(parsed?.highlights)?parsed.highlights:[];
        const articleKey=matchText(article);
        const verifiedRows=(Array.isArray(parsed?.results)?parsed.results:[]).map(row=>{
          const group=clean(row?.group),participant=clean(row?.participant),result=clean(row?.result);
          if(!group||!participant||!result||result.length>120)return null;
          const isTeam=/\bteam$/i.test(participant),nameKey=matchText(participant.replace(/\s+team$/i,''));
          if(isTeam&&/^1st\b/i.test(result)&&/\b(?:team title|team victory|won the team|team championship)\b/i.test(article))return{group,participant,result:'1st'};
          if(isTeam)return null;
          if(!nameKey||!articleKey.includes(nameKey))return null;
          const sourceResult=recapAthleteResult(article,participant);
          return sourceResult?{group,participant,result:sourceResult}:null;
        }).filter(Boolean);
        const seenParticipants=new Set();
        meetResults=verifiedRows.filter(row=>{const key=matchText(row.participant);if(seenParticipants.has(key))return false;seenParticipants.add(key);return true;});
      }catch{}
    }else{
      const start=response.indexOf('['),end=response.lastIndexOf(']');
      if(start>=0&&end>start){
      try{
        const parsed=JSON.parse(response.slice(start,end+1));
        list=Array.isArray(parsed)?parsed:(parsed?.highlights||[]);
      }catch{}
      }
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
    return cleanItems.length>=3?{items:cleanItems,results:meetResults,state:'recap_generated'}:{items:null,results:meetResults,state:'insufficient_highlights'};
  }catch(error){
    return{items:null,state:'ai_failed',error:clean(error?.message||'AI request failed')?.slice(0,160)||'AI request failed'};
  }
}
async function attachOfficialHighlights(events,raw,school,sport,sourceUrl,now,env=null,aiTargetId=null){
  const target=events.find(e=>e.status==='Final'&&e.id===aiTargetId);
  if(!target)return events;
  if(target.event_type==='MEET'&&!target.result_url)target.result_url=discoverOfficialMeetResultUrl(raw,sourceUrl);
  await attachOfficialMeetResults(target);
  if(target.highlights_verified)return events;
  // A card-bound recap is already tied to the exact event. Avoid rescanning a
  // very large schedule document when this direct identity is available.
  const recapIndex=target.recap_url?{map:new Map(),candidates:[]}:recapUrlsByEvent(raw,school,sport,sourceUrl,now);
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
          const embeddedRelativeNews=/"(\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'?#]+)"/gi;
          const addNewsLink=value=>{const link=absoluteUrl(value,newsUrl.href);if(link&&datePath?.test(link)&&!links.includes(link))links.push(link);};
          while((m=newsLink.exec(linkHtml))){
            addNewsLink(m[1]);
          }
          while((m=embeddedNews.exec(linkHtml)))addNewsLink(m[1]);
          while((m=embeddedRelativeNews.exec(linkHtml)))addNewsLink(m[1]);
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
  // Results links are not consistently present on schedule cards. Many schools
  // publish the official timing link only inside the recap, so discover and
  // parse it here through the same school-neutral meet-results pipeline.
  if(target.event_type==='MEET'&&recapHtml){
    target.result_url=target.result_url||discoverOfficialMeetResultUrl(recapHtml,recapUrl);
    await attachOfficialMeetResults(target);
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
  const recapRows=target.sport==='Cross Country'?parseCrossCountryRecapRows(recapHtml,target):[];
  target.recap_result_count=recapRows.length;
  if(recapRows.length){target.results=recapRows;target.result_count=recapRows.length;target.has_more_results=recapRows.length>3;target.meet_results_verified=true;}
  const aiResult=await generateAIHighlights(env,target,recapHtml);
  if(!recapRows.length&&aiResult.results?.length){
    target.results=aiResult.results;
    target.result_count=aiResult.results.length;
    target.has_more_results=aiResult.results.length>3;
    target.meet_results_verified=true;
  }
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
async function fetchUrl(url,school,sport,now,env=null,aiTargetId=null){const r=await fetch(url,{headers:HEADERS,redirect:'follow'}),html=await r.text(),finalUrl=r.url||url,parseable=compactScheduleHtml(html,finalUrl),labels=extractEventLabels(parseable);let events=r.ok?labelTeamEvents(parseHtml(parseable,school,sport,finalUrl,now),sport,finalUrl):[];if(events.length&&aiTargetId)events=await attachOfficialHighlights(events,html,school,sport,finalUrl,now,env,aiTargetId);return{requested_url:url,url:finalUrl,http_status:r.status,ok:r.ok,content_length:html.length,label_count:labels.length,event_count:events.length,has_upcoming:/Upcoming Event:/i.test(decodeHtml(parseable)),has_completed:/Completed Event:/i.test(decodeHtml(parseable)),events};}
function normalizedTeamName(value){return slug(value||'').replace(/-/g,' ')}
function scoreboardTeamMatchesSchool(team,school){
  const wanted=[school.id,school.name,school.short_name,...(school.aliases||[])].map(normalizedTeamName).filter(x=>x.length>=2);
  const exact=[team?.location,team?.displayName,team?.shortDisplayName,team?.abbreviation,team?.name].map(normalizedTeamName).filter(Boolean);
  if(wanted.some(x=>exact.includes(x)))return true;
  const full=normalizedTeamName(team?.displayName);
  return wanted.filter(x=>x.length>=4&&!['wildcats','cougars','bears','tigers'].includes(x)).some(x=>full===x||full.startsWith(x+' '));
}
function scoreboardDateKey(value){const n=Date.parse(value||'');return Number.isFinite(n)?new Date(n).toISOString().slice(0,10):''}
function scoreboardDates(now){
  return[-1,0,1].map(offset=>{const d=new Date(now);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10).replaceAll('-','')});
}
async function fetchFootballScoreboard(school,now){
  const found=[];
  for(const date of scoreboardDates(now)){
    const url=`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?limit=1000&dates=${date}`;
    try{
      const response=await fetch(url,{headers:{'User-Agent':HEADERS['User-Agent'],'Accept':'application/json'},cf:{cacheTtl:15,cacheEverything:true}});
      if(!response.ok)continue;
      const payload=await response.json();
      for(const item of payload?.events||[]){
        const competition=item?.competitions?.[0],competitors=competition?.competitors||[];
        const ours=competitors.find(c=>scoreboardTeamMatchesSchool(c?.team,school));
        if(!ours)continue;
        const opponent=competitors.find(c=>c!==ours);if(!opponent)continue;
        const type=competition?.status?.type||item?.status?.type||{},state=String(type.state||'').toLowerCase();
        if(state!=='in'&&state!=='post'&&!type.completed)continue;
        const start=new Date(competition?.date||item?.date||now.toISOString()),dateText=start.toLocaleDateString('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'});
        const status=state==='in'?'Live':'Final',detail=clean(type.shortDetail||type.detail||(status==='Live'?'Live now':'Final'));
        const event=makeEvent({school,sport:'Football',status,relation:ours.homeAway==='away'?'at':'vs',opponent:opponent.team?.shortDisplayName||opponent.team?.displayName||'Opponent',date:dateText,time:null,schoolScore:status==='Final'?ours.score:null,oppScore:status==='Final'?opponent.score:null,resultText:null,sourceUrl:url,now});
        if(status==='Live'){
          event.status='Live';event.priority_bucket='live';event.school_score=ours.score??null;event.opponent_score=opponent.score??null;event.headline=detail;event.recency_label=detail||'Live now';event.results=[];event.result_count=0;
        }else event.recency_label='Final';
        event.source={name:'Live college football scoreboard',url,updated_at:now.toISOString()};
        event.live_score_source=url;event.verification_state='live_scoreboard';event.source_count=1;
        found.push(event);
      }
    }catch{}
  }
  return mergeEvents([found]);
}
function reconcileFootballScores(scheduleEvents,scoreEvents){
  const events=scheduleEvents.slice();
  for(const score of scoreEvents){
    const day=scoreboardDateKey(score.start_time);
    const index=events.findIndex(event=>event.sport==='Football'&&scoreboardDateKey(event.start_time)===day);
    if(index<0){events.push(score);continue}
    const official=events[index];
    events[index]={...official,status:score.status,priority_bucket:score.priority_bucket,school_score:score.school_score,opponent_score:score.opponent_score,headline:score.headline,recency_label:score.recency_label,last_verified_at:score.last_verified_at,freshness_seconds:0,verification_state:'official_schedule+live_scoreboard',source_count:2,live_score_source:score.live_score_source};
  }
  return events;
}
async function fetchLive(schoolId,sport,env=null,aiTargetId=null){
  const school=schools.find(s=>s.id===schoolId),now=new Date();
  if(!school)return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:'School not found'};
  const urls=candidateUrls(school,sport),errors=[],successful=[];
  // Candidate paths are fallbacks, not independent feeds. Stop after the first
  // usable official schedule instead of hammering every possible publisher URL.
  const combined=COMBINED_TEAM_SPORTS.has(sport);
  for(const url of urls){
    if(combined&&successful.length&&teamLabelForSource(sport,url)==null)continue;
    try{
      const item=await fetchUrl(url,school,sport,now,env,aiTargetId);
      if(item.ok&&item.events.length){successful.push(item);if(!combined)break;continue}
      errors.push(`${item.url}: HTTP ${item.http_status}, labels ${item.label_count}, events ${item.event_count}`);
    }catch(error){errors.push(`${url}: ${error?.message||error?.name||'FetchError'}`)}
  }
  let events=mergeEvents(successful.map(x=>x.events));
  // Cross-country cards must use one global results contract. Enrich every
  // completed meet that already exposes an official result link before the
  // grouped feed is cached, so the summary count and cards match the modal.
  if(sport==='Cross Country')await Promise.all(events.filter(event=>event.status==='Final'&&event.result_url).map(event=>attachOfficialMeetResults(event)));
  if(sport==='Football'){
    const scoreboard=await fetchFootballScoreboard(school,now);
    events=reconcileFootballScores(events,scoreboard);
    if(scoreboard.length)successful.push({url:scoreboard[0].live_score_source,events:scoreboard});
  }
  if(events.length)return{events,source_url:successful[0]?.url||null,source_urls:[...new Set(successful.map(x=>x.url))],fetched_at:now.toISOString(),live_source_used:true,error:null};
  return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:errors.slice(-6).join('; ')||'No live source available'};
}
function feedCacheKey(url,school,sport){const key=new URL('/__sas_cache/feed',url.origin);key.searchParams.set('school',school);key.searchParams.set('sport',sport);key.searchParams.set('feed_cache',VERSION);return new Request(key.toString(),{method:'GET'});}
function sponsoredSportError(school,sport){const allowed=sponsoredSports[school];return allowed&&!allowed.includes(sport)?json({detail:{message:`${school} does not sponsor ${sport}`,school,sport}},422):null;}
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
    if(url.pathname==='/schools'){let list=schools;const q=(url.searchParams.get('q')||'').toLowerCase(),conference=url.searchParams.get('conference'),state=url.searchParams.get('state');if(q)list=list.filter(s=>[s.id,s.name,s.short_name,...(s.aliases||[])].join(' ').toLowerCase().includes(q));if(conference)list=list.filter(s=>s.conference.toLowerCase()===conference.toLowerCase());if(state)list=list.filter(s=>s.state.toLowerCase()===state.toLowerCase());return json(list.map(s=>({...s,sponsored_sports:sponsoredSports[s.id]||null})));}
    if(url.pathname==='/api/diagnostic'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);return json(await diagnostic(school,sport));}
    if(url.pathname==='/api/verify'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);return json(await verification(school,sport));}
    if(url.pathname==='/live/athletes'){
      const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');
      if(!school||!sport)return json({detail:'school and sport are required'},400);
      const unsupported=sponsoredSportError(school,sport);if(unsupported)return unsupported;
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
      const unsupported=sponsoredSportError(school,sport);if(unsupported)return unsupported;
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
      const unsupported=sponsoredSportError(school,sport);if(unsupported)return unsupported;
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
